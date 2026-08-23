package controller

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay"
)

// resolveOpenAIVideoResultURL refreshes an OpenAI-compatible video task and
// returns the provider's actual media URL. Some providers, including OpenLux
// Veo, expose the result as video_url and do not implement /content.
func resolveOpenAIVideoResultURL(channel *model.Channel, task *model.Task) (string, error) {
	if channel == nil || task == nil {
		return "", fmt.Errorf("invalid channel or task")
	}

	baseURL := channel.GetBaseURL()
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}

	adaptor := relay.GetTaskAdaptor(task.Platform)
	if adaptor == nil {
		adaptor = relay.GetTaskAdaptor(constant.TaskPlatform(strconv.Itoa(channel.Type)))
	}
	if adaptor == nil {
		return "", fmt.Errorf("video task adaptor not found")
	}

	apiKey := strings.TrimSpace(task.PrivateData.Key)
	if apiKey == "" {
		apiKey = channel.Key
	}
	resp, err := adaptor.FetchTask(baseURL, apiKey, map[string]any{
		"task_id": task.GetUpstreamTaskID(),
		"action":  task.Action,
	}, channel.GetSetting().Proxy)
	if err != nil {
		return "", fmt.Errorf("fetch task failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", fmt.Errorf("upstream task query returned status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read task response failed: %w", err)
	}

	taskInfo, err := adaptor.ParseTaskResult(body)
	if err != nil {
		return "", fmt.Errorf("parse task response failed: %w", err)
	}
	if taskInfo == nil || strings.TrimSpace(taskInfo.Url) == "" {
		return "", fmt.Errorf("video URL not found in task response")
	}
	return strings.TrimSpace(taskInfo.Url), nil
}
