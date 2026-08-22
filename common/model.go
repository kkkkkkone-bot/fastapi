package common

import "strings"

var (
	// OpenAIResponseOnlyModels is a list of models that are only available for OpenAI responses.
	OpenAIResponseOnlyModels = []string{
		"o3-pro",
		"o3-deep-research",
		"o4-mini-deep-research",
	}
	ImageGenerationModels = []string{
		"dall-e-3",
		"dall-e-2",
		"gpt-image-",
		"grok",
		"chatgpt-image-",
		"prefix:imagen-",
		"flux-",
		"flux.1-",
		"seedream-",
		"jimeng_high_aes_general",
		"wanx",
		"qwen-image",
		"z-image",
		"image-01",
		"stable-diffusion",
		"sdxl",
		"playground",
		"recraft",
		"ideogram",
		"kandinsky",
	}
	VideoGenerationModels = []string{
		"sora-",
		"veo-",
		"kling-",
		"vidu",
		"pixverse",
		"hailuo",
		"minimax-hailuo",
		"t2v-",
		"i2v-",
		"s2v-",
		"seedance-",
		"doubao-seedance-",
		"wan2.",
		"wanx2.",
		"jimeng_vgfm_",
		"jimeng_t2v_",
		"jimeng_i2v_",
		"jimeng_v30",
	}
	OpenAITextModels = []string{
		"gpt-",
		"o1",
		"o3",
		"o4",
		"chatgpt",
	}
)

func IsOpenAIResponseOnlyModel(modelName string) bool {
	for _, m := range OpenAIResponseOnlyModels {
		if strings.Contains(modelName, m) {
			return true
		}
	}
	return false
}

func IsImageGenerationModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	prefixes := GetImageGenerationModelPrefixes()
	if len(prefixes) == 0 {
		// 后台未配置时回退到内置默认列表，保证开箱即用
		prefixes = ImageGenerationModels
	}
	for _, m := range prefixes {
		if strings.HasPrefix(m, "prefix:") {
			if strings.HasPrefix(modelName, strings.TrimPrefix(m, "prefix:")) {
				return true
			}
			continue
		}
		if strings.Contains(modelName, m) {
			return true
		}
	}
	return false
}

// GetImageGenerationModelPrefixes 返回运营在后台配置的「图片生成模型前缀」列表。
// 它读取数据库托管的 OptionMap 中的 ImageGenerationModelPrefixes 项，
// 让管理员无需重新编译即可新增图片模型家族（如 grok）。
// 当该配置为空时返回 nil，调用方应回退到内置的 ImageGenerationModels 默认列表。
func GetImageGenerationModelPrefixes() []string {
	OptionMapRWMutex.RLock()
	raw, ok := OptionMap["ImageGenerationModelPrefixes"]
	OptionMapRWMutex.RUnlock()
	if !ok || strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	prefixes := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			prefixes = append(prefixes, p)
		}
	}
	return prefixes
}

func IsVideoGenerationModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	for _, modelFamily := range VideoGenerationModels {
		if strings.Contains(modelName, modelFamily) {
			return true
		}
	}
	return false
}

func IsOpenAITextModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	for _, m := range OpenAITextModels {
		if strings.Contains(modelName, m) {
			return true
		}
	}
	return false
}
