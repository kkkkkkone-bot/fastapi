package middleware

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/relay/constant"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetModelRequestReadsPlaygroundImageEditMultipartFields(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("model", "gpt-image-1"))
	require.NoError(t, writer.WriteField("group", "vip"))
	require.NoError(t, writer.WriteField("prompt", "make it brighter"))
	imagePart, err := writer.CreateFormFile("image", "reference.png")
	require.NoError(t, err)
	_, err = imagePart.Write([]byte("fake image"))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(http.MethodPost, "/pg/images/edits", &body)
	context.Request.Header.Set("Content-Type", writer.FormDataContentType())

	request, shouldSelectChannel, err := getModelRequest(context)
	require.NoError(t, err)
	require.True(t, shouldSelectChannel)
	require.Equal(t, "gpt-image-1", request.Model)
	require.Equal(t, "vip", request.Group)
}

func TestGetModelRequestReadsPlaygroundVideoSubmit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(
		http.MethodPost,
		"/pg/videos",
		bytes.NewBufferString(`{"model":"sora-2","group":"6-视频通用","prompt":"ocean at dusk"}`),
	)
	context.Request.Header.Set("Content-Type", "application/json")

	request, shouldSelectChannel, err := getModelRequest(context)
	require.NoError(t, err)
	require.True(t, shouldSelectChannel)
	require.Equal(t, "sora-2", request.Model)
	require.Equal(t, "6-视频通用", request.Group)
	require.Equal(t, constant.RelayModeVideoSubmit, context.GetInt("relay_mode"))
}

func TestGetModelRequestClassifiesPlaygroundVideoFetch(t *testing.T) {
	gin.SetMode(gin.TestMode)

	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(http.MethodGet, "/pg/videos/task-123", nil)

	request, shouldSelectChannel, err := getModelRequest(context)
	require.NoError(t, err)
	require.False(t, shouldSelectChannel)
	require.Empty(t, request.Model)
	require.Equal(t, constant.RelayModeVideoFetchByID, context.GetInt("relay_mode"))
}
