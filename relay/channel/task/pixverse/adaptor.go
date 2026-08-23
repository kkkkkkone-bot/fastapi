package pixverse

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel"
	taskcommon "github.com/QuantumNous/new-api/relay/channel/task/taskcommon"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"
	video_pricing "github.com/QuantumNous/new-api/setting/video_pricing"

	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
)

// ============================
// Request / Response structures
// ============================

type submitRequest struct {
	Prompt      string   `json:"prompt"`
	Model       string   `json:"model"`
	Quality     string   `json:"quality"`
	Duration    int      `json:"duration"`
	AspectRatio string   `json:"aspect_ratio"`
	MotionMode  string   `json:"motion_mode,omitempty"`
	Images      []string `json:"images,omitempty"`
}

type submitResponse struct {
	TaskID  string `json:"task_id"`
	ErrCode int    `json:"ErrCode"`
	ErrMsg  string `json:"ErrMsg"`
	Resp    struct {
		VideoID json.Number `json:"video_id"`
	} `json:"Resp"`
	RespData struct {
		ID json.Number `json:"id"`
	} `json:"RespData"`
}

type taskStatusResponse struct {
	Status   string           `json:"status"`
	Error    string           `json:"error,omitempty"`
	URL      string           `json:"url,omitempty"`
	VideoID  string           `json:"video_id,omitempty"`
	ErrCode  int              `json:"ErrCode"`
	ErrMsg   string           `json:"ErrMsg"`
	Resp     pixVerseTaskData `json:"Resp"`
	RespData pixVerseTaskData `json:"RespData"`
}

type pixVerseTaskData struct {
	Status int    `json:"status"`
	URL    string `json:"url"`
}

// ============================
// Adaptor implementation
// ============================

type TaskAdaptor struct {
	taskcommon.BaseBilling
	baseURL string
}

func (a *TaskAdaptor) Init(info *relaycommon.RelayInfo) {
	a.baseURL = info.ChannelBaseUrl
}

func (a *TaskAdaptor) GetChannelName() string {
	return "pixverse"
}

func (a *TaskAdaptor) GetModelList() []string {
	return []string{"pixverse-video"}
}

func (a *TaskAdaptor) ValidateRequestAndSetAction(c *gin.Context, info *relaycommon.RelayInfo) *dto.TaskError {
	if err := relaycommon.ValidateBasicTaskRequest(c, info, constant.TaskActionTextGenerate); err != nil {
		return err
	}
	req, err := relaycommon.GetTaskRequest(c)
	if err != nil {
		return service.TaskErrorWrapper(err, "get_task_request_failed", http.StatusBadRequest)
	}
	if req.HasImage() {
		return service.TaskErrorWrapperLocal(fmt.Errorf("pixverse-video reference images require an upstream img_id upload and are not supported by this endpoint"), "invalid_request", http.StatusBadRequest)
	}
	version := a.getMetadataString(req.Metadata, "model_version", "c1")
	quality := a.getMetadataString(req.Metadata, "quality", "720p")
	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	if _, err := pixVerseRequestPrice(version, quality, taskcommon.DefaultInt(req.Duration, 5), mode); err != nil {
		return service.TaskErrorWrapperLocal(err, "invalid_request", http.StatusBadRequest)
	}
	info.Action = constant.TaskActionTextGenerate
	return nil
}

func (a *TaskAdaptor) EstimateBilling(c *gin.Context, info *relaycommon.RelayInfo) map[string]float64 {
	req, err := relaycommon.GetTaskRequest(c)
	if err != nil {
		return nil
	}
	multiplier, err := video_pricing.EstimateMultiplier(
		video_pricing.PixVerseVideoModel,
		video_pricing.Options{
			ModelVersion: a.getMetadataString(req.Metadata, "model_version", "c1"),
			Resolution:   a.getMetadataString(req.Metadata, "quality", "720p"),
			Duration:     taskcommon.DefaultInt(req.Duration, 5),
			Mode:         strings.ToLower(strings.TrimSpace(req.Mode)),
		},
	)
	if err != nil {
		return nil
	}
	return map[string]float64{"request_cost": multiplier}
}

func (a *TaskAdaptor) BuildRequestURL(info *relaycommon.RelayInfo) (string, error) {
	return fmt.Sprintf("%s/openapi/v2/video/text/generate", a.baseURL), nil
}

func (a *TaskAdaptor) BuildRequestHeader(c *gin.Context, req *http.Request, info *relaycommon.RelayInfo) error {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+info.ApiKey)
	req.Header.Set("API-KEY", info.ApiKey)
	req.Header.Set("Ai-trace-id", info.PublicTaskID)
	return nil
}

func (a *TaskAdaptor) BuildRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (io.Reader, error) {
	v, exists := c.Get("task_request")
	if !exists {
		return nil, fmt.Errorf("request not found in context")
	}
	req := v.(relaycommon.TaskSubmitReq)

	body, err := a.convertToRequestPayload(&req, info)
	if err != nil {
		return nil, err
	}

	data, err := common.Marshal(body)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(data), nil
}

func (a *TaskAdaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (*http.Response, error) {
	return channel.DoTaskApiRequest(a, c, info, requestBody)
}

func (a *TaskAdaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (taskID string, taskData []byte, taskErr *dto.TaskError) {
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		taskErr = service.TaskErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
		return
	}

	var sResp submitResponse
	err = common.Unmarshal(responseBody, &sResp)
	if err != nil {
		taskErr = service.TaskErrorWrapper(errors.Wrap(err, fmt.Sprintf("%s", responseBody)), "unmarshal_response_failed", http.StatusInternalServerError)
		return
	}
	if sResp.ErrCode != 0 {
		taskErr = service.TaskErrorWrapperLocal(fmt.Errorf("pixverse error %d: %s", sResp.ErrCode, sResp.ErrMsg), "upstream_error", http.StatusBadRequest)
		return
	}

	upstreamTaskID := sResp.TaskID
	if upstreamTaskID == "" {
		upstreamTaskID = sResp.Resp.VideoID.String()
	}
	if upstreamTaskID == "" {
		upstreamTaskID = sResp.RespData.ID.String()
	}
	if upstreamTaskID == "" {
		taskErr = service.TaskErrorWrapperLocal(fmt.Errorf("empty task_id in response: %s", string(responseBody)), "empty_task_id", http.StatusBadRequest)
		return
	}

	ov := dto.NewOpenAIVideo()
	ov.ID = info.PublicTaskID
	ov.TaskID = info.PublicTaskID
	ov.CreatedAt = time.Now().Unix()
	ov.Model = info.OriginModelName
	c.JSON(http.StatusOK, ov)
	return upstreamTaskID, responseBody, nil
}

func (a *TaskAdaptor) FetchTask(baseUrl, key string, body map[string]any, proxy string) (*http.Response, error) {
	taskID, ok := body["task_id"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid task_id")
	}

	url := fmt.Sprintf("%s/openapi/v2/video/result/%s", baseUrl, taskID)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("API-KEY", key)

	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		return nil, fmt.Errorf("new proxy http client failed: %w", err)
	}
	return client.Do(req)
}

func (a *TaskAdaptor) ParseTaskResult(respBody []byte) (*relaycommon.TaskInfo, error) {
	taskInfo := &relaycommon.TaskInfo{}

	var tResp taskStatusResponse
	err := common.Unmarshal(respBody, &tResp)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal response body")
	}

	if tResp.ErrCode != 0 {
		taskInfo.Status = model.TaskStatusFailure
		taskInfo.Reason = tResp.ErrMsg
		return taskInfo, nil
	}
	data := tResp.Resp
	if data.Status == 0 && data.URL == "" {
		data = tResp.RespData
	}
	if data.Status != 0 {
		switch data.Status {
		case 1:
			taskInfo.Status = model.TaskStatusSuccess
			taskInfo.Url = data.URL
		case 7, 8:
			taskInfo.Status = model.TaskStatusFailure
			taskInfo.Reason = taskcommon.DefaultString(tResp.ErrMsg, "pixverse generation failed")
		default:
			taskInfo.Status = model.TaskStatusInProgress
		}
		return taskInfo, nil
	}

	switch strings.ToLower(tResp.Status) {
	case "pending", "created", "queued", "processing", "in_progress":
		taskInfo.Status = model.TaskStatusInProgress
	case "succeeded", "completed", "success":
		taskInfo.Status = model.TaskStatusSuccess
		if tResp.URL != "" {
			taskInfo.Url = tResp.URL
		}
	case "failed", "failure", "error", "cancelled", "canceled":
		taskInfo.Status = model.TaskStatusFailure
		taskInfo.Reason = tResp.Error
	default:
		taskInfo.Status = model.TaskStatusInProgress
	}

	return taskInfo, nil
}

func (a *TaskAdaptor) ConvertToOpenAIVideo(originTask *model.Task) ([]byte, error) {
	openAIVideo := dto.NewOpenAIVideo()
	openAIVideo.ID = originTask.TaskID
	openAIVideo.Status = originTask.Status.ToVideoStatus()
	openAIVideo.SetProgressStr(originTask.Progress)
	openAIVideo.CreatedAt = originTask.CreatedAt
	openAIVideo.CompletedAt = originTask.UpdatedAt

	if url := originTask.GetResultURL(); url != "" {
		openAIVideo.SetMetadata("url", url)
	}

	return common.Marshal(openAIVideo)
}

// ============================
// helpers
// ============================

func (a *TaskAdaptor) convertToRequestPayload(req *relaycommon.TaskSubmitReq, info *relaycommon.RelayInfo) (*submitRequest, error) {
	duration := taskcommon.DefaultInt(req.Duration, 5)
	if duration <= 0 {
		duration = 5
	}

	body := &submitRequest{
		Prompt:      req.Prompt,
		Model:       a.getMetadataString(req.Metadata, "model_version", "c1"),
		Quality:     a.getMetadataString(req.Metadata, "quality", "720p"),
		Duration:    duration,
		AspectRatio: resolveAspectRatio(taskcommon.DefaultString(req.Size, "16:9")),
		Images:      req.Images,
	}
	if loVersion := strings.ToLower(body.Model); loVersion == "v3.5" || loVersion == "v4" || loVersion == "v4.5" {
		body.MotionMode = taskcommon.DefaultString(strings.ToLower(strings.TrimSpace(req.Mode)), "normal")
	}

	return body, nil
}

func (a *TaskAdaptor) getMetadataString(metadata map[string]any, key, fallback string) string {
	if metadata == nil {
		return fallback
	}
	if v, ok := metadata[key].(string); ok && v != "" {
		return v
	}
	return fallback
}

func resolveAspectRatio(size string) string {
	switch strings.ToLower(size) {
	case "16:9", "1280x720", "1920x1080":
		return "16:9"
	case "9:16", "720x1280", "1080x1920":
		return "9:16"
	case "1:1", "1024x1024":
		return "1:1"
	case "4:3", "1024x768":
		return "4:3"
	case "3:4", "768x1024":
		return "3:4"
	default:
		return "16:9"
	}
}

func pixVerseRequestPrice(version, quality string, duration int, mode string) (float64, error) {
	return video_pricing.EstimateReferencePrice(
		video_pricing.PixVerseVideoModel,
		video_pricing.Options{
			ModelVersion: version,
			Resolution:   quality,
			Duration:     duration,
			Mode:         mode,
		},
	)
}
