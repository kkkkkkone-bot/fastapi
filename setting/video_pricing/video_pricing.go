/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

package video_pricing

import (
	"fmt"
	"strings"
)

const (
	GrokImagineVideoModel = "grok-imagine-video-1.5-preview"
	PixVerseVideoModel    = "pixverse-video"
	KlingVideoModel       = "kling-video"
	ViduQ3TurboModel      = "viduq3-turbo"
	Veo31Model            = "veo_3_1"
	Veo31ComponentsModel  = "veo_3_1-components"
)

const (
	grokReferencePrice     = 0.0353
	pixVerseReferencePrice = 0.0181
	klingReferencePrice    = 0.1323
	viduReferencePrice     = 0.0184
)

// Options contains only request fields that can affect the price of the
// supported aggregate video models.
type Options struct {
	ModelVersion    string
	Resolution      string
	Duration        int
	Mode            string
	Audio           bool
	InputImage      bool
	InputImageCount int
}

// Row is one public, supported video pricing combination. Multiplier is
// applied to the administrator-configured per-request model price.
type Row struct {
	ModelVersion string  `json:"model_version,omitempty"`
	Resolution   string  `json:"resolution,omitempty"`
	Duration     int     `json:"duration"`
	Mode         string  `json:"mode,omitempty"`
	Audio        string  `json:"audio,omitempty"`
	Input        string  `json:"input,omitempty"`
	Multiplier   float64 `json:"multiplier"`
}

// Pricing is attached to the public model catalog so clients can render the
// same specification matrix used by task billing.
type Pricing struct {
	Rows []Row `json:"rows"`
}

// GetPricing returns all supported, billable combinations for a model.
func GetPricing(model string) *Pricing {
	model = strings.ToLower(strings.TrimSpace(model))
	rows := make([]Row, 0)

	switch model {
	case GrokImagineVideoModel:
		for _, resolution := range []string{"480p", "720p"} {
			for duration := 1; duration <= 15; duration++ {
				for _, input := range []string{"text", "image"} {
					options := Options{
						Resolution: resolution,
						Duration:   duration,
						InputImage: input == "image",
					}
					rows = appendPriceRow(rows, model, options, Row{
						Resolution: resolution,
						Duration:   duration,
						Input:      input,
					})
				}
			}
		}
	case PixVerseVideoModel:
		versions := []string{"c1", "v6", "v5.6", "v5.5", "v5", "v4.5", "v4", "v3.5"}
		qualities := []string{"360p", "540p", "720p", "1080p"}
		for _, version := range versions {
			audioOptions := []bool{false}
			if version == "c1" || version == "v6" || version == "v5.6" || version == "v5.5" {
				audioOptions = []bool{false, true}
			}
			modes := []string{""}
			if version == "v4.5" || version == "v4" || version == "v3.5" {
				modes = []string{"normal", "fast"}
			}
			for _, quality := range qualities {
				for _, duration := range []int{5, 8, 10} {
					for _, mode := range modes {
						for _, audio := range audioOptions {
							audioValue := "off"
							if audio {
								audioValue = "on"
							}
							options := Options{
								ModelVersion: version,
								Resolution:   quality,
								Duration:     duration,
								Mode:         mode,
								Audio:        audio,
							}
							rows = appendPriceRow(rows, model, options, Row{
								ModelVersion: version,
								Resolution:   quality,
								Duration:     duration,
								Mode:         mode,
								Audio:        audioValue,
							})
						}
					}
				}
			}
		}
	case KlingVideoModel:
		for _, version := range []string{"kling-v2-6", "kling-v3"} {
			durations := []int{5, 10}
			if version == "kling-v3" {
				durations = integerRange(3, 15)
			}
			for _, mode := range []string{"std", "pro"} {
				for _, duration := range durations {
					for _, audio := range []bool{false, true} {
						options := Options{
							ModelVersion: version,
							Duration:     duration,
							Mode:         mode,
							Audio:        audio,
						}
						audioValue := "off"
						if audio {
							audioValue = "on"
						}
						rows = appendPriceRow(rows, model, options, Row{
							ModelVersion: version,
							Duration:     duration,
							Mode:         mode,
							Audio:        audioValue,
						})
					}
				}
			}
		}
	case ViduQ3TurboModel:
		for _, resolution := range []string{"540p", "720p", "1080p"} {
			for duration := 1; duration <= 16; duration++ {
				options := Options{Resolution: resolution, Duration: duration}
				rows = appendPriceRow(rows, model, options, Row{
					Resolution: resolution,
					Duration:   duration,
				})
			}
		}
	case Veo31Model, Veo31ComponentsModel:
		for _, resolution := range []string{"720p", "1080p"} {
			rows = append(rows, Row{
				Resolution: resolution,
				Duration:   8,
				Multiplier: 1,
			})
		}
	default:
		return nil
	}

	return &Pricing{Rows: rows}
}

// EstimateMultiplier returns the request multiplier relative to the model's
// configurable anchor price.
func EstimateMultiplier(model string, options Options) (float64, error) {
	model = strings.ToLower(strings.TrimSpace(model))
	referencePrice, err := EstimateReferencePrice(model, options)
	if err != nil {
		return 0, err
	}

	basePrice := referenceBasePrice(model)
	if basePrice == 0 {
		return 0, fmt.Errorf("video pricing is not configured for model: %s", model)
	}
	return referencePrice / basePrice, nil
}

// EstimateReferencePrice evaluates the normalized reference price matrix. It
// is exported for provider regression tests; customer billing uses the
// multiplier returned by EstimateMultiplier and the configured model price.
func EstimateReferencePrice(model string, options Options) (float64, error) {
	model = strings.ToLower(strings.TrimSpace(model))
	resolution := strings.ToLower(strings.TrimSpace(options.Resolution))
	version := strings.ToLower(strings.TrimSpace(options.ModelVersion))
	mode := strings.ToLower(strings.TrimSpace(options.Mode))

	switch model {
	case GrokImagineVideoModel:
		if options.Duration < 1 || options.Duration > 15 {
			return 0, fmt.Errorf("grok video duration must be between 1 and 15 seconds")
		}
		if resolution == "" {
			resolution = "480p"
		}
		rate := grokReferencePrice
		if resolution == "720p" {
			rate = 0.0618
		} else if resolution != "480p" {
			return 0, fmt.Errorf("unsupported grok video resolution: %s", resolution)
		}
		price := float64(options.Duration) * rate
		imageCount := options.InputImageCount
		if imageCount == 0 && options.InputImage {
			imageCount = 1
		}
		if imageCount < 0 || imageCount > 7 {
			return 0, fmt.Errorf("grok video accepts at most seven input images")
		}
		if imageCount > 0 {
			price += float64(imageCount) * 0.00441
		}
		return price, nil
	case PixVerseVideoModel:
		return estimatePixVerseReferencePrice(version, resolution, options.Duration, mode, options.Audio)
	case KlingVideoModel:
		if version == "" {
			version = "kling-v2-6"
		}
		return estimateKlingReferencePrice(version, mode, options.Duration, options.Audio)
	case ViduQ3TurboModel:
		if options.Duration < 1 || options.Duration > 16 {
			return 0, fmt.Errorf("viduq3-turbo duration must be between 1 and 16 seconds")
		}
		rates := map[string]float64{
			"540p":  0.0184,
			"720p":  0.0276,
			"1080p": 0.0368,
		}
		rate := rates[resolution]
		if rate == 0 {
			return 0, fmt.Errorf("unsupported viduq3-turbo resolution: %s", resolution)
		}
		return float64(options.Duration) * rate, nil
	case Veo31Model, Veo31ComponentsModel:
		if options.Duration != 8 {
			return 0, fmt.Errorf("%s duration must be 8 seconds", model)
		}
		if resolution != "720p" && resolution != "1080p" {
			return 0, fmt.Errorf("unsupported %s resolution: %s", model, resolution)
		}
		return 1, nil
	default:
		return 0, fmt.Errorf("video pricing is not configured for model: %s", model)
	}
}

func estimatePixVerseReferencePrice(version, quality string, duration int, mode string, audio bool) (float64, error) {
	if quality != "360p" && quality != "540p" && quality != "720p" && quality != "1080p" {
		return 0, fmt.Errorf("unsupported pixverse quality: %s", quality)
	}

	if version == "c1" || version == "v6" {
		if duration != 5 && duration != 8 && duration != 10 {
			return 0, fmt.Errorf("pixverse %s duration must be 5, 8, or 10 seconds", version)
		}
		audioValue := "off"
		if audio {
			audioValue = "on"
		}
		rates := map[string]float64{
			"c1:360p:off": 0.0181, "c1:540p:off": 0.0242, "c1:720p:off": 0.0302, "c1:1080p:off": 0.0574,
			"c1:360p:on": 0.0242, "c1:540p:on": 0.0302, "c1:720p:on": 0.0393, "c1:1080p:on": 0.0725,
			"v6:360p:off": 0.0151, "v6:540p:off": 0.0211, "v6:720p:off": 0.0272, "v6:1080p:off": 0.0544,
			"v6:360p:on": 0.0211, "v6:540p:on": 0.0272, "v6:720p:on": 0.0362, "v6:1080p:on": 0.0695,
		}
		return float64(duration) * rates[version+":"+quality+":"+audioValue], nil
	}

	baseCredits := map[string]int{
		"360p":  45,
		"540p":  45,
		"720p":  60,
		"1080p": 120,
	}
	if version == "v5.6" {
		if duration != 5 && duration != 8 && duration != 10 {
			return 0, fmt.Errorf("pixverse v5.6 duration must be 5, 8, or 10 seconds")
		}
		audioValue := "off"
		if audio {
			audioValue = "on"
		}
		prices := map[string]map[int]float64{
			"360p:off":  {5: 0.1057, 8: 0.2114, 10: 0.2325},
			"540p:off":  {5: 0.1057, 8: 0.2114, 10: 0.2325},
			"720p:off":  {5: 0.1359, 8: 0.2718, 10: 0.2990},
			"1080p:off": {5: 0.2265, 8: 0.4530, 10: 0.4983},
			"360p:on":   {5: 0.2416, 8: 0.3473, 10: 0.3684},
			"540p:on":   {5: 0.2416, 8: 0.3473, 10: 0.3684},
			"720p:on":   {5: 0.2718, 8: 0.4077, 10: 0.4349},
			"1080p:on":  {5: 0.3624, 8: 0.5889, 10: 0.6342},
		}
		return prices[quality+":"+audioValue][duration], nil
	}
	if version == "v5.5" {
		if duration != 5 && duration != 8 && duration != 10 {
			return 0, fmt.Errorf("pixverse v5.5 duration must be 5, 8, or 10 seconds")
		}
		multiplier := map[int]float64{5: 1, 8: 2, 10: 2.2}[duration]
		credits := float64(baseCredits[quality]) * multiplier
		if audio {
			credits += 10
		}
		return credits * 0.00302, nil
	}
	if audio {
		return 0, fmt.Errorf("pixverse %s does not support audio generation", version)
	}
	if version == "v5" {
		if duration != 5 && duration != 8 {
			return 0, fmt.Errorf("pixverse v5 duration must be 5 or 8 seconds")
		}
		multiplier := map[int]float64{5: 1, 8: 2}[duration]
		return float64(baseCredits[quality]) * multiplier * 0.00302, nil
	}
	if version == "v3.5" || version == "v4" || version == "v4.5" {
		if mode == "" {
			mode = "normal"
		}
		if mode != "normal" && mode != "fast" {
			return 0, fmt.Errorf("pixverse %s mode must be normal or fast", version)
		}
		if mode == "fast" {
			if duration != 5 {
				return 0, fmt.Errorf("pixverse fast mode only supports 5 seconds")
			}
			if quality == "1080p" {
				return 0, fmt.Errorf("pixverse fast mode does not support 1080p")
			}
			return float64(baseCredits[quality]) * 2 * 0.00302, nil
		}
		if duration != 5 && duration != 8 {
			return 0, fmt.Errorf("pixverse %s duration must be 5 or 8 seconds", version)
		}
		multiplier := map[int]float64{5: 1, 8: 2}[duration]
		return float64(baseCredits[quality]) * multiplier * 0.00302, nil
	}

	return 0, fmt.Errorf("unsupported pixverse model version: %s", version)
}

func estimateKlingReferencePrice(version, mode string, duration int, audio bool) (float64, error) {
	if version != "kling-v2-6" && version != "kling-v3" {
		return 0, fmt.Errorf("unsupported kling model_version: %s", version)
	}
	if mode != "std" && mode != "pro" {
		return 0, fmt.Errorf("kling mode must be std or pro")
	}
	if version == "kling-v2-6" {
		if duration != 5 && duration != 10 {
			return 0, fmt.Errorf("kling-v2-6 duration must be 5 or 10 seconds")
		}
		if audio && mode != "pro" {
			return 0, fmt.Errorf("kling-v2-6 audio requires pro mode")
		}
		fiveSecondPrice := klingReferencePrice
		if mode == "pro" {
			fiveSecondPrice = 0.2205
			if audio {
				fiveSecondPrice = 0.4410
			}
		}
		return fiveSecondPrice * float64(duration) / 5, nil
	}
	if duration < 3 || duration > 15 {
		return 0, fmt.Errorf("kling-v3 duration must be between 3 and 15 seconds")
	}
	rate := 0.0529
	if mode == "std" && audio {
		rate = 0.0794
	} else if mode == "pro" && !audio {
		rate = 0.0706
	} else if mode == "pro" && audio {
		rate = 0.1058
	}
	return rate * float64(duration), nil
}

func appendPriceRow(rows []Row, model string, options Options, row Row) []Row {
	multiplier, err := EstimateMultiplier(model, options)
	if err != nil {
		return rows
	}
	row.Multiplier = multiplier
	return append(rows, row)
}

func referenceBasePrice(model string) float64 {
	switch model {
	case GrokImagineVideoModel:
		return grokReferencePrice
	case PixVerseVideoModel:
		return pixVerseReferencePrice
	case KlingVideoModel:
		return klingReferencePrice
	case ViduQ3TurboModel:
		return viduReferencePrice
	case Veo31Model, Veo31ComponentsModel:
		return 1
	default:
		return 0
	}
}

func integerRange(start, end int) []int {
	values := make([]int, 0, end-start+1)
	for value := start; value <= end; value++ {
		values = append(values, value)
	}
	return values
}
