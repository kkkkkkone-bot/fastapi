package controller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveOpenAIVideoResultURLSupportsOpenLuxVeo(t *testing.T) {
	service.InitHttpClient()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/videos/upstream-veo-task", r.URL.Path)
		assert.Equal(t, "Bearer task-specific-key", r.Header.Get("Authorization"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"id": "upstream-veo-task",
			"status": "succeeded",
			"video_url": "https://cdn.example.com/veo-result.mp4"
		}`))
	}))
	defer server.Close()

	baseURL := server.URL
	channel := &model.Channel{
		Type:    constant.ChannelTypeSora,
		Key:     "channel-key",
		BaseURL: &baseURL,
	}
	task := &model.Task{
		TaskID:   "task_public",
		Platform: constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeSora)),
		PrivateData: model.TaskPrivateData{
			Key:            "task-specific-key",
			UpstreamTaskID: "upstream-veo-task",
		},
	}

	videoURL, err := resolveOpenAIVideoResultURL(channel, task)

	require.NoError(t, err)
	assert.Equal(t, "https://cdn.example.com/veo-result.mp4", videoURL)
}

func TestResolveOpenAIVideoResultURLRejectsMissingVideoURL(t *testing.T) {
	service.InitHttpClient()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprint(w, `{"id":"upstream-veo-task","status":"succeeded"}`)
	}))
	defer server.Close()

	baseURL := server.URL
	channel := &model.Channel{Type: constant.ChannelTypeSora, Key: "channel-key", BaseURL: &baseURL}
	task := &model.Task{
		Platform: constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeSora)),
		PrivateData: model.TaskPrivateData{
			UpstreamTaskID: "upstream-veo-task",
		},
	}

	_, err := resolveOpenAIVideoResultURL(channel, task)

	require.ErrorContains(t, err, "video URL not found")
}
