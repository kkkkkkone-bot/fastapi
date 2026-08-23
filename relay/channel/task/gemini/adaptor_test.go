package gemini

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVeoUnderscoreModelUsesCommonQualityAndDurationFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/videos", nil)
	ctx.Set("task_request", relaycommon.TaskSubmitReq{
		Prompt:   "A sunrise over the ocean",
		Duration: 8,
		Size:     "1280x720",
		Metadata: map[string]any{"quality": "1080p"},
	})
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "veo_3_1"},
	}

	body, err := (&TaskAdaptor{}).BuildRequestBody(ctx, info)
	require.NoError(t, err)
	data, err := io.ReadAll(body)
	require.NoError(t, err)
	var payload VeoRequestPayload
	require.NoError(t, common.Unmarshal(data, &payload))
	assert.Equal(t, 8, payload.Parameters.DurationSeconds)
	assert.Equal(t, "1080p", payload.Parameters.Resolution)
	assert.Equal(t, "16:9", payload.Parameters.AspectRatio)
}
