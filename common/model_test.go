package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsImageGenerationModelRecognizesSupportedModelFamilies(t *testing.T) {
	tests := []struct {
		model string
		want  bool
	}{
		{model: "gpt-image-1.5", want: true},
		{model: "chatgpt-image-latest", want: true},
		{model: "imagen-4.0-generate-001", want: true},
		{model: "black-forest-labs/FLUX.1-schnell", want: true},
		{model: "doubao-seedream-4-0-250828", want: true},
		{model: "jimeng_high_aes_general_v21_L", want: true},
		{model: "gpt-4o-mini", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			assert.Equal(t, tt.want, IsImageGenerationModel(tt.model))
		})
	}
}

func TestIsVideoGenerationModelRecognizesSupportedModelFamilies(t *testing.T) {
	tests := []struct {
		model string
		want  bool
	}{
		{model: "sora-2-pro", want: true},
		{model: "veo-3.1-generate-preview", want: true},
		{model: "kling-v2-master", want: true},
		{model: "MiniMax-Hailuo-2.3", want: true},
		{model: "doubao-seedance-2-0-260128", want: true},
		{model: "wan2.7-i2v", want: true},
		{model: "jimeng_vgfm_t2v_l20", want: true},
		{model: "gpt-image-1", want: false},
		{model: "gpt-4o-mini", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			assert.Equal(t, tt.want, IsVideoGenerationModel(tt.model))
		})
	}
}
