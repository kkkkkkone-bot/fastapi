package relay

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsOpenAIVideoRequest(t *testing.T) {
	assert.True(t, isOpenAIVideoRequest("/v1/videos/task-123"))
	assert.True(t, isOpenAIVideoRequest("/pg/videos/task-123?refresh=1"))
	assert.False(t, isOpenAIVideoRequest("/v1/video/generations/task-123"))
}
