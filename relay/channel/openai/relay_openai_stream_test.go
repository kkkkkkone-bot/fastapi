package openai

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func newChatStreamTestContext(t *testing.T, body string) (*gin.Context, *httptest.ResponseRecorder, *http.Response, *relaycommon.RelayInfo) {
	t.Helper()
	oldTimeout := constant.StreamingTimeout
	constant.StreamingTimeout = 30
	t.Cleanup(func() { constant.StreamingTimeout = oldTimeout })

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"text/event-stream"}},
		Body:       io.NopCloser(strings.NewReader(body)),
	}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "gpt-test"},
		IsStream:    true,
		RelayMode:   relayconstant.RelayModeChatCompletions,
		RelayFormat: types.RelayFormatOpenAI,
		DisablePing: true,
	}
	return c, recorder, resp, info
}

func TestOaiStreamHandlerRejectsRoleOnlyEOF(t *testing.T) {
	c, recorder, resp, info := newChatStreamTestContext(t,
		`data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1710000000,"model":"gpt-test","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}`+"\n")

	usage, err := OaiStreamHandler(c, info, resp)

	require.Nil(t, usage)
	require.NotNil(t, err)
	require.Equal(t, types.ErrorCodeBadResponse, err.GetErrorCode())
	require.Empty(t, recorder.Body.String())
	require.NotNil(t, info.StreamStatus)
	require.Equal(t, relaycommon.StreamEndReasonEOF, info.StreamStatus.EndReason)
}

func TestOaiStreamHandlerRejectsBareDone(t *testing.T) {
	c, recorder, resp, info := newChatStreamTestContext(t, "data: [DONE]\n")

	usage, err := OaiStreamHandler(c, info, resp)

	require.Nil(t, usage)
	require.NotNil(t, err)
	require.Equal(t, types.ErrorCodeEmptyResponse, err.GetErrorCode())
	require.Empty(t, recorder.Body.String())
	require.NotNil(t, info.StreamStatus)
	require.Equal(t, relaycommon.StreamEndReasonDone, info.StreamStatus.EndReason)
}

func TestOaiStreamHandlerRejectsUsageOnlyStream(t *testing.T) {
	c, recorder, resp, info := newChatStreamTestContext(t,
		`data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1710000000,"model":"gpt-test","choices":[],"usage":{"prompt_tokens":42,"completion_tokens":0,"total_tokens":42}}`+"\n"+"data: [DONE]\n")

	usage, err := OaiStreamHandler(c, info, resp)

	require.Nil(t, usage)
	require.NotNil(t, err)
	require.Equal(t, types.ErrorCodeEmptyResponse, err.GetErrorCode())
	require.Empty(t, recorder.Body.String())
}

func TestOaiStreamHandlerDoesNotSynthesizeDoneAfterPartialStream(t *testing.T) {
	body := strings.Join([]string{
		`data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1710000000,"model":"gpt-test","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}`,
		`data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1710000000,"model":"gpt-test","choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}`,
	}, "\n")
	c, recorder, resp, info := newChatStreamTestContext(t, body)

	usage, err := OaiStreamHandler(c, info, resp)

	require.Nil(t, usage)
	require.NotNil(t, err)
	require.Equal(t, types.ErrorCodeBadResponse, err.GetErrorCode())
	require.Contains(t, recorder.Body.String(), `"role":"assistant"`)
	require.NotContains(t, recorder.Body.String(), "data: [DONE]")
	require.True(t, c.Writer.Written())
}

func TestOaiStreamHandlerAcceptsCompletedStream(t *testing.T) {
	body := strings.Join([]string{
		`data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1710000000,"model":"gpt-test","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}`,
		`data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1710000000,"model":"gpt-test","choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}`,
		`data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1710000000,"model":"gpt-test","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}`,
		"data: [DONE]",
	}, "\n")
	c, recorder, resp, info := newChatStreamTestContext(t, body)

	usage, err := OaiStreamHandler(c, info, resp)

	require.Nil(t, err)
	require.NotNil(t, usage)
	require.Contains(t, recorder.Body.String(), `"content":"hello"`)
	require.Contains(t, recorder.Body.String(), `"finish_reason":"stop"`)
	require.Contains(t, recorder.Body.String(), "data: [DONE]")
}

func TestOaiResponsesStreamHandlerRejectsStreamWithoutTerminalEvent(t *testing.T) {
	c, recorder, resp, info := newChatStreamTestContext(t,
		`data: {"type":"response.created","response":{"id":"resp-test","model":"gpt-test"}}`+"\n"+"data: [DONE]\n")
	info.RelayMode = relayconstant.RelayModeResponses

	usage, err := OaiResponsesStreamHandler(c, info, resp)

	require.Nil(t, usage)
	require.NotNil(t, err)
	require.Equal(t, types.ErrorCodeEmptyResponse, err.GetErrorCode())
	require.Contains(t, recorder.Body.String(), "event: response.created")
	require.NotContains(t, recorder.Body.String(), "data: [DONE]")
}

func TestOaiResponsesStreamHandlerAcceptsCompletedEvent(t *testing.T) {
	c, _, resp, info := newChatStreamTestContext(t,
		`data: {"type":"response.completed","response":{"id":"resp-test","model":"gpt-test","usage":{"input_tokens":2,"output_tokens":3,"total_tokens":5}}}`+"\n"+"data: [DONE]\n")
	info.RelayMode = relayconstant.RelayModeResponses

	usage, err := OaiResponsesStreamHandler(c, info, resp)

	require.Nil(t, err)
	require.NotNil(t, usage)
	require.Equal(t, &dto.Usage{PromptTokens: 2, CompletionTokens: 3, TotalTokens: 5}, usage)
}
