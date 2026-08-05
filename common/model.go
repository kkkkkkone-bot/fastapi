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
		"gpt-image-1",
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
	for _, m := range ImageGenerationModels {
		if strings.Contains(modelName, m) {
			return true
		}
		if strings.HasPrefix(m, "prefix:") && strings.HasPrefix(modelName, strings.TrimPrefix(m, "prefix:")) {
			return true
		}
	}
	return false
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
