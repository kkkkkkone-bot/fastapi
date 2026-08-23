package sora

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGrokEstimateBillingIncludesResolutionDurationAndInputImage(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set("task_request", relaycommon.TaskSubmitReq{
		Prompt:   "Animate the portrait",
		Duration: 10,
		Images:   []string{"data:image/png;base64,AAAA"},
		Metadata: map[string]any{"quality": "720p"},
	})
	info := &relaycommon.RelayInfo{
		OriginModelName: "grok-imagine-video-1.5-preview",
		ChannelMeta:     &relaycommon.ChannelMeta{UpstreamModelName: "grok-imagine-video-1.5-preview"},
		TaskRelayInfo:   &relaycommon.TaskRelayInfo{},
	}

	ratios := (&TaskAdaptor{}).EstimateBilling(ctx, info)

	assert.InDelta(t, (10*0.0618+0.00441)/0.0353, ratios["request_cost"], 1e-9)
}

func TestGrokBuildRequestBodyUsesDocumentedFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/videos", nil)
	ctx.Set("task_request", relaycommon.TaskSubmitReq{
		Prompt:   "Animate the portrait",
		Duration: 6,
		Size:     "720x1280",
		Images:   []string{"https://example.com/input.png"},
		Metadata: map[string]any{"quality": "720p"},
	})
	info := &relaycommon.RelayInfo{
		OriginModelName: "grok-imagine-video-1.5-preview",
		ChannelMeta:     &relaycommon.ChannelMeta{UpstreamModelName: "grok-imagine-video-1.5-preview"},
		TaskRelayInfo:   &relaycommon.TaskRelayInfo{},
	}

	body, err := (&TaskAdaptor{}).BuildRequestBody(ctx, info)
	require.NoError(t, err)
	data, err := io.ReadAll(body)
	require.NoError(t, err)
	var request grokVideoRequest
	require.NoError(t, common.Unmarshal(data, &request))
	assert.Equal(t, "720p", request.Resolution)
	assert.Equal(t, "9:16", request.AspectRatio)
	assert.Equal(t, 6, request.Duration)
	require.NotNil(t, request.Image)
	assert.Equal(t, "https://example.com/input.png", request.Image.URL)
}

func TestGrokBuildRequestURL(t *testing.T) {
	adaptor := &TaskAdaptor{baseURL: "https://api.example.com"}
	info := &relaycommon.RelayInfo{
		OriginModelName: "grok-imagine-video-1.5-preview",
		ChannelMeta:     &relaycommon.ChannelMeta{UpstreamModelName: "grok-imagine-video-1.5-preview"},
		TaskRelayInfo:   &relaycommon.TaskRelayInfo{},
	}

	url, err := adaptor.BuildRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://api.example.com/v1/videos/generations", url)
}

func TestGrokResponsesUseRequestIDAndCompletedVideoURL(t *testing.T) {
	result, err := (&TaskAdaptor{}).ParseTaskResult([]byte(`{
		"status": "done",
		"video": {"url": "https://example.com/result.mp4", "duration": 6},
		"progress": 100
	}`))

	require.NoError(t, err)
	assert.Equal(t, "https://example.com/result.mp4", result.Url)
}

func TestGrokSubmitResponseAcceptsRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	info := &relaycommon.RelayInfo{
		OriginModelName: "grok-imagine-video-1.5-preview",
		ChannelMeta:     &relaycommon.ChannelMeta{},
		TaskRelayInfo:   &relaycommon.TaskRelayInfo{PublicTaskID: "task_public"},
	}
	response := &http.Response{
		Body: io.NopCloser(strings.NewReader(`{"request_id":"upstream-request-id"}`)),
	}

	taskID, _, taskErr := (&TaskAdaptor{}).DoResponse(ctx, response, info)

	require.Nil(t, taskErr)
	assert.Equal(t, "upstream-request-id", taskID)
	assert.Contains(t, recorder.Body.String(), "task_public")
}
