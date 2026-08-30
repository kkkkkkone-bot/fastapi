package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestCachePolicyByResourceType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		path     string
		expected string
	}{
		{path: "/", expected: "no-cache"},
		{path: "/pricing/", expected: "no-cache"},
		{path: "/api/status", expected: "no-cache"},
		{path: "/static/js/index.3603e65c85.js", expected: "public, max-age=31536000, immutable"},
		{path: "/static/css/index.bfca99637d.css", expected: "public, max-age=31536000, immutable"},
		{path: "/static/js/index.js", expected: "public, max-age=604800"},
		{path: "/logo.png", expected: "public, max-age=604800"},
	}

	for _, test := range tests {
		t.Run(test.path, func(t *testing.T) {
			engine := gin.New()
			engine.Use(Cache())
			engine.GET(test.path, func(c *gin.Context) {
				c.Status(http.StatusNoContent)
			})

			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, test.path, nil)
			engine.ServeHTTP(recorder, request)

			assert.Equal(t, test.expected, recorder.Header().Get("Cache-Control"))
		})
	}
}
