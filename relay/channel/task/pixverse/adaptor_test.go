package pixverse

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPixVerseRequestPriceMatrix(t *testing.T) {
	tests := []struct {
		name     string
		version  string
		quality  string
		duration int
		mode     string
		want     float64
	}{
		{name: "c1 per second", version: "c1", quality: "720p", duration: 10, want: 0.302},
		{name: "v6 per second", version: "v6", quality: "1080p", duration: 8, want: 0.4352},
		{name: "v5.6 single subject", version: "v5.6", quality: "720p", duration: 10, want: 0.2990},
		{name: "v5.5 ten seconds", version: "v5.5", quality: "1080p", duration: 10, want: 0.79728},
		{name: "v5 normal", version: "v5", quality: "720p", duration: 8, want: 0.3624},
		{name: "v4.5 fast", version: "v4.5", quality: "720p", duration: 5, mode: "fast", want: 0.3624},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			price, err := pixVerseRequestPrice(test.version, test.quality, test.duration, test.mode)
			require.NoError(t, err)
			assert.InDelta(t, test.want, price, 1e-9)
		})
	}
}

func TestPixVerseRequestPriceRejectsUnsupportedFastCombination(t *testing.T) {
	_, err := pixVerseRequestPrice("v4", "1080p", 5, "fast")
	require.ErrorContains(t, err, "does not support 1080p")
}

func TestPixVerseParseOfficialTaskResult(t *testing.T) {
	result, err := (&TaskAdaptor{}).ParseTaskResult([]byte(`{
		"ErrCode": 0,
		"Resp": {"status": 1, "url": "https://example.com/video.mp4"}
	}`))

	require.NoError(t, err)
	assert.Equal(t, model.TaskStatusSuccess, result.Status)
	assert.Equal(t, "https://example.com/video.mp4", result.Url)
}
