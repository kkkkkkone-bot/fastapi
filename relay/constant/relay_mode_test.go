package constant

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPath2RelayModeRecognizesPlaygroundImageRoutes(t *testing.T) {
	tests := []struct {
		path string
		mode int
	}{
		{path: "/pg/images/generations", mode: RelayModeImagesGenerations},
		{path: "/pg/images/edits", mode: RelayModeImagesEdits},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			assert.Equal(t, tt.mode, Path2RelayMode(tt.path))
		})
	}
}
