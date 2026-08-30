package middleware

import (
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

var fingerprintedAssetPattern = regexp.MustCompile(`[.-][a-f0-9]{8,}\.(?:css|js)$`)

func Cache() func(c *gin.Context) {
	return func(c *gin.Context) {
		requestPath := c.Request.URL.Path
		switch {
		case strings.HasPrefix(requestPath, "/static/") && fingerprintedAssetPattern.MatchString(requestPath):
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		case strings.HasPrefix(requestPath, "/static/") ||
			strings.HasSuffix(requestPath, ".png") ||
			strings.HasSuffix(requestPath, ".ico") ||
			strings.HasSuffix(requestPath, ".svg") ||
			strings.HasSuffix(requestPath, ".webp") ||
			strings.HasSuffix(requestPath, ".avif") ||
			strings.HasSuffix(requestPath, ".woff2"):
			c.Header("Cache-Control", "public, max-age=604800")
		default:
			c.Header("Cache-Control", "no-cache")
		}
		c.Header("Cache-Version", "b688f2fb5be447c25e5aa3bd063087a83db32a288bf6a4f35f2d8db310e40b14")
		c.Next()
	}
}
