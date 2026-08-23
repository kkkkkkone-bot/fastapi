package video_pricing

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPublicPricingRowsMatchBillingEstimator(t *testing.T) {
	models := []string{
		GrokImagineVideoModel,
		PixVerseVideoModel,
		KlingVideoModel,
		ViduQ3TurboModel,
		Veo31Model,
		Veo31ComponentsModel,
	}

	for _, model := range models {
		t.Run(model, func(t *testing.T) {
			pricing := GetPricing(model)
			require.NotNil(t, pricing)
			require.NotEmpty(t, pricing.Rows)

			for _, row := range pricing.Rows {
				multiplier, err := EstimateMultiplier(model, Options{
					ModelVersion: row.ModelVersion,
					Resolution:   row.Resolution,
					Duration:     row.Duration,
					Mode:         row.Mode,
					Audio:        row.Audio == "on",
					InputImage:   row.Input == "image",
				})
				require.NoError(t, err)
				assert.InDelta(t, row.Multiplier, multiplier, 1e-9)
			}
		})
	}
}

func TestKlingPricingOmitsUnsupportedV26StandardAudio(t *testing.T) {
	pricing := GetPricing(KlingVideoModel)
	require.NotNil(t, pricing)

	for _, row := range pricing.Rows {
		if row.ModelVersion == "kling-v2-6" && row.Mode == "std" {
			assert.Equal(t, "off", row.Audio)
		}
	}

	_, err := EstimateMultiplier(KlingVideoModel, Options{
		ModelVersion: "kling-v2-6",
		Duration:     5,
		Mode:         "std",
		Audio:        true,
	})
	require.ErrorContains(t, err, "audio requires pro mode")
}

func TestPixVersePricingIncludesSupportedAudioTiers(t *testing.T) {
	pricing := GetPricing(PixVerseVideoModel)
	require.NotNil(t, pricing)

	var audioRow *Row
	for index := range pricing.Rows {
		row := &pricing.Rows[index]
		if row.ModelVersion == "c1" && row.Resolution == "720p" && row.Duration == 5 && row.Audio == "on" {
			audioRow = row
			break
		}
	}
	require.NotNil(t, audioRow)
	assert.InDelta(t, 0.0393/pixVerseReferencePrice*5, audioRow.Multiplier, 1e-9)

	_, err := EstimateReferencePrice(PixVerseVideoModel, Options{
		ModelVersion: "v5",
		Resolution:   "720p",
		Duration:     5,
		Audio:        true,
	})
	require.ErrorContains(t, err, "does not support audio generation")
}

func TestGrokPricingChargesEveryInputImage(t *testing.T) {
	price, err := EstimateReferencePrice(GrokImagineVideoModel, Options{
		Resolution:      "720p",
		Duration:        10,
		InputImageCount: 7,
	})

	require.NoError(t, err)
	assert.InDelta(t, 10*0.0618+7*0.00441, price, 1e-9)

	_, err = EstimateReferencePrice(GrokImagineVideoModel, Options{
		Resolution:      "720p",
		Duration:        10,
		InputImageCount: 8,
	})
	require.ErrorContains(t, err, "at most seven")
}
