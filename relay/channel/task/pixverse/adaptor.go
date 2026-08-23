package pixverse

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
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
	Prompt            string  `json:"prompt"`
	Model             string  `json:"model"`
	Quality           string  `json:"quality"`
	Duration          int     `json:"duration"`
	AspectRatio       string  `json:"aspect_ratio"`
	MotionMode        string  `json:"motion_mode,omitempty"`
	SoundEffectSwitch *bool   `json:"sound_effect_switch,omitempty"`
	ImgID             int64   `json:"img_id,omitempty"`
	FirstFrameImg     int64   `json:"first_frame_img,omitempty"`
	LastFrameImg      int64   `json:"last_frame_img,omitempty"`
	ImgIDs            []int64 `json:"img_ids,omitempty"`
}

type imageUploadResponse struct {
	ErrCode  int    `json:"ErrCode"`
	ErrMsg   string `json:"ErrMsg"`
	RespData struct {
		ID int64 `json:"id"`
	} `json:"RespData"`
}

const (
	pixVerseActionTransition = "transition"
	pixVerseActionFusion     = "fusion"
)

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
	version := a.getMetadataString(req.Metadata, "model_version", "c1")
	maxImages := maxPixVerseReferenceImages(version)
	if len(req.Images) > maxImages {
		return service.TaskErrorWrapperLocal(
			fmt.Errorf("pixverse %s accepts at most %d input images", version, maxImages),
			"invalid_request",
			http.StatusBadRequest,
		)
	}
	quality := a.getMetadataString(req.Metadata, "quality", "720p")
	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	audio, err := pixVerseAudioSetting(req.Metadata)
	if err != nil {
		return service.TaskErrorWrapperLocal(err, "invalid_request", http.StatusBadRequest)
	}
	if _, err := pixVerseRequestPrice(version, quality, taskcommon.DefaultInt(req.Duration, 5), mode, audio != nil && *audio); err != nil {
		return service.TaskErrorWrapperLocal(err, "invalid_request", http.StatusBadRequest)
	}
	switch len(req.Images) {
	case 0:
		info.Action = constant.TaskActionTextGenerate
	case 1:
		info.Action = constant.TaskActionGenerate
	case 2:
		info.Action = pixVerseActionTransition
	default:
		info.Action = pixVerseActionFusion
	}
	return nil
}

func (a *TaskAdaptor) EstimateBilling(c *gin.Context, info *relaycommon.RelayInfo) map[string]float64 {
	req, err := relaycommon.GetTaskRequest(c)
	if err != nil {
		return nil
	}
	audio, err := pixVerseAudioSetting(req.Metadata)
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
			Audio:        audio != nil && *audio,
		},
	)
	if err != nil {
		return nil
	}
	return map[string]float64{"request_cost": multiplier}
}

func (a *TaskAdaptor) BuildRequestURL(info *relaycommon.RelayInfo) (string, error) {
	path := "/openapi/v2/video/text/generate"
	switch info.Action {
	case constant.TaskActionGenerate:
		path = "/openapi/v2/video/img/generate"
	case pixVerseActionTransition:
		path = "/openapi/v2/video/transition/generate"
	case pixVerseActionFusion:
		path = "/openapi/v2/video/fusion/generate"
	}
	return a.baseURL + path, nil
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
	req, err := relaycommon.GetTaskRequest(c)
	if err != nil || len(req.Images) == 0 {
		return channel.DoTaskApiRequest(a, c, info, requestBody)
	}

	imageIDs, err := a.uploadImages(c, info, req.Images)
	if err != nil {
		return nil, err
	}
	body, err := a.convertToRequestPayload(&req, info)
	if err != nil {
		return nil, err
	}
	switch len(imageIDs) {
	case 1:
		body.ImgID = imageIDs[0]
	case 2:
		body.FirstFrameImg = imageIDs[0]
		body.LastFrameImg = imageIDs[1]
	default:
		body.ImgIDs = imageIDs
	}
	data, err := common.Marshal(body)
	if err != nil {
		return nil, err
	}
	return channel.DoTaskApiRequest(a, c, info, bytes.NewReader(data))
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
	}
	soundEffectSwitch, err := pixVerseAudioSetting(req.Metadata)
	if err != nil {
		return nil, err
	}
	body.SoundEffectSwitch = soundEffectSwitch
	if loVersion := strings.ToLower(body.Model); loVersion == "v3.5" || loVersion == "v4" || loVersion == "v4.5" {
		body.MotionMode = taskcommon.DefaultString(strings.ToLower(strings.TrimSpace(req.Mode)), "normal")
	}

	return body, nil
}

func maxPixVerseReferenceImages(version string) int {
	switch strings.ToLower(strings.TrimSpace(version)) {
	case "c1", "v6", "v5.6", "v5.5":
		return 7
	case "v5", "v4.5":
		return 3
	default:
		return 2
	}
}

func (a *TaskAdaptor) uploadImages(c *gin.Context, info *relaycommon.RelayInfo, images []string) ([]int64, error) {
	client, err := service.GetHttpClientWithProxy(info.ChannelSetting.Proxy)
	if err != nil {
		return nil, fmt.Errorf("create pixverse image upload client: %w", err)
	}

	imageIDs := make([]int64, 0, len(images))
	for index, image := range images {
		body, contentType, err := pixVerseImageUploadBody(image, index)
		if err != nil {
			return nil, err
		}
		request, err := http.NewRequestWithContext(
			c.Request.Context(),
			http.MethodPost,
			a.baseURL+"/openapi/v2/image/upload",
			bytes.NewReader(body),
		)
		if err != nil {
			return nil, fmt.Errorf("create pixverse image upload request: %w", err)
		}
		request.Header.Set("Content-Type", contentType)
		request.Header.Set("Accept", "application/json")
		request.Header.Set("Authorization", "Bearer "+info.ApiKey)
		request.Header.Set("API-KEY", info.ApiKey)
		request.Header.Set("Ai-trace-id", fmt.Sprintf("%s-image-%d", info.PublicTaskID, index+1))

		response, err := client.Do(request)
		if err != nil {
			return nil, fmt.Errorf("upload pixverse image %d: %w", index+1, err)
		}
		responseBody, readErr := io.ReadAll(response.Body)
		_ = response.Body.Close()
		if readErr != nil {
			return nil, fmt.Errorf("read pixverse image upload response: %w", readErr)
		}
		if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
			return nil, fmt.Errorf("pixverse image upload failed with status %d: %s", response.StatusCode, responseBody)
		}

		var uploadResponse imageUploadResponse
		if err := common.Unmarshal(responseBody, &uploadResponse); err != nil {
			return nil, fmt.Errorf("decode pixverse image upload response: %w", err)
		}
		if uploadResponse.ErrCode != 0 || uploadResponse.RespData.ID == 0 {
			return nil, fmt.Errorf("pixverse image upload failed: %s", uploadResponse.ErrMsg)
		}
		imageIDs = append(imageIDs, uploadResponse.RespData.ID)
	}
	return imageIDs, nil
}

func pixVerseImageUploadBody(image string, index int) ([]byte, string, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	image = strings.TrimSpace(image)

	if strings.HasPrefix(image, "http://") || strings.HasPrefix(image, "https://") {
		if err := writer.WriteField("image_url", image); err != nil {
			return nil, "", err
		}
	} else {
		comma := strings.Index(image, ",")
		if !strings.HasPrefix(image, "data:image/") || comma < 0 {
			return nil, "", fmt.Errorf("pixverse image %d must be a data URL or HTTP URL", index+1)
		}
		metadata := image[len("data:"):comma]
		parts := strings.Split(metadata, ";")
		if len(parts) < 2 || parts[len(parts)-1] != "base64" {
			return nil, "", fmt.Errorf("pixverse image %d must be base64 encoded", index+1)
		}
		mimeType := parts[0]
		extension := "png"
		switch mimeType {
		case "image/jpeg", "image/jpg":
			extension = "jpg"
		case "image/png":
		case "image/webp":
			extension = "webp"
		default:
			return nil, "", fmt.Errorf("unsupported pixverse image type: %s", mimeType)
		}
		imageBytes, err := base64.StdEncoding.DecodeString(image[comma+1:])
		if err != nil {
			return nil, "", fmt.Errorf("decode pixverse image %d: %w", index+1, err)
		}
		header := make(textproto.MIMEHeader)
		header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="image"; filename="reference-%d.%s"`, index+1, extension))
		header.Set("Content-Type", mimeType)
		part, err := writer.CreatePart(header)
		if err != nil {
			return nil, "", err
		}
		if _, err := part.Write(imageBytes); err != nil {
			return nil, "", err
		}
	}

	if err := writer.Close(); err != nil {
		return nil, "", err
	}
	return body.Bytes(), writer.FormDataContentType(), nil
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

func pixVerseAudioSetting(metadata map[string]any) (*bool, error) {
	if metadata == nil {
		return nil, nil
	}
	raw, exists := metadata["sound"]
	if !exists {
		return nil, nil
	}
	if enabled, ok := raw.(bool); ok {
		return &enabled, nil
	}
	value, ok := raw.(string)
	if !ok {
		return nil, fmt.Errorf("pixverse sound must be on, off, true, or false")
	}
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "on", "true":
		enabled := true
		return &enabled, nil
	case "off", "false":
		enabled := false
		return &enabled, nil
	default:
		return nil, fmt.Errorf("pixverse sound must be on, off, true, or false")
	}
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

func pixVerseRequestPrice(version, quality string, duration int, mode string, audio bool) (float64, error) {
	return video_pricing.EstimateReferencePrice(
		video_pricing.PixVerseVideoModel,
		video_pricing.Options{
			ModelVersion: version,
			Resolution:   quality,
			Duration:     duration,
			Mode:         mode,
			Audio:        audio,
		},
	)
}
