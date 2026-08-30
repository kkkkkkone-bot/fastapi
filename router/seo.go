package router

import (
	"bytes"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"path"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
)

const (
	seoTitleStart       = "<!-- SEO_TITLE_START -->"
	seoTitleEnd         = "<!-- SEO_TITLE_END -->"
	seoDescriptionStart = "<!-- SEO_DESCRIPTION_START -->"
	seoDescriptionEnd   = "<!-- SEO_DESCRIPTION_END -->"
	seoHeadMarker       = "<!-- SEO_HEAD -->"
)

type seoMetadata struct {
	Title       string
	Description string
	Canonical   string
	Robots      string
	PageType    string
}

var knownBrowserExactRoutes = map[string]struct{}{
	"/":                     {},
	"/about":                {},
	"/channels":             {},
	"/chat2link":            {},
	"/console":              {},
	"/console/channel":      {},
	"/console/deployment":   {},
	"/console/log":          {},
	"/console/midjourney":   {},
	"/console/models":       {},
	"/console/personal":     {},
	"/console/playground":   {},
	"/console/redemption":   {},
	"/console/setting":      {},
	"/console/subscription": {},
	"/console/task":         {},
	"/console/token":        {},
	"/console/topup":        {},
	"/console/user":         {},
	"/dashboard":            {},
	"/forbidden":            {},
	"/forgot-password":      {},
	"/image-generation":     {},
	"/keys":                 {},
	"/login":                {},
	"/models":               {},
	"/oauth":                {},
	"/otp":                  {},
	"/playground":           {},
	"/pricing":              {},
	"/privacy-policy":       {},
	"/profile":              {},
	"/rankings":             {},
	"/redemption-codes":     {},
	"/register":             {},
	"/reset":                {},
	"/setup":                {},
	"/sign-in":              {},
	"/sign-up":              {},
	"/skill-ranking":        {},
	"/subscriptions":        {},
	"/system-info":          {},
	"/system-settings":      {},
	"/usage-logs":           {},
	"/user/reset":           {},
	"/user-agreement":       {},
	"/users":                {},
	"/video-generation":     {},
	"/wallet":               {},
	"/401":                  {},
	"/403":                  {},
	"/404":                  {},
	"/500":                  {},
	"/503":                  {},
}

var systemSettingsSections = map[string]struct{}{
	"auth":       {},
	"billing":    {},
	"content":    {},
	"models":     {},
	"operations": {},
	"security":   {},
	"site":       {},
}

func registerSEORoutes(router *gin.Engine) {
	router.GET("/robots.txt", serveRobots)
	router.GET("/sitemap.xml", serveSitemap)
}

func serveRobots(c *gin.Context) {
	baseURL := seoBaseURL(c.Request)
	robots := strings.Join([]string{
		"User-agent: *",
		"Allow: /",
		"Disallow: /api/",
		"Disallow: /v1/",
		"",
		"Sitemap: " + baseURL + "/sitemap.xml",
		"",
	}, "\n")
	c.Header("Cache-Control", "public, max-age=3600")
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(robots))
}

func serveSitemap(c *gin.Context) {
	baseURL := seoBaseURL(c.Request)
	urls := []string{
		baseURL + "/",
		baseURL + "/pricing/",
	}

	var builder strings.Builder
	builder.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
	builder.WriteString("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")
	for _, siteURL := range urls {
		builder.WriteString("  <url><loc>")
		builder.WriteString(html.EscapeString(siteURL))
		builder.WriteString("</loc></url>\n")
	}
	builder.WriteString("</urlset>\n")

	c.Header("Cache-Control", "public, max-age=3600")
	c.Data(http.StatusOK, "application/xml; charset=utf-8", []byte(builder.String()))
}

func seoBaseURL(request *http.Request) string {
	configured := strings.TrimSpace(system_setting.ServerAddress)
	if parsed, err := url.Parse(configured); err == nil && parsed.Scheme != "" && parsed.Host != "" {
		parsed.Path = ""
		parsed.RawPath = ""
		parsed.RawQuery = ""
		parsed.Fragment = ""
		return strings.TrimRight(parsed.String(), "/")
	}

	scheme := strings.TrimSpace(request.Header.Get("X-Forwarded-Proto"))
	if comma := strings.IndexByte(scheme, ','); comma >= 0 {
		scheme = strings.TrimSpace(scheme[:comma])
	}
	if scheme == "" {
		if request.TLS != nil {
			scheme = "https"
		} else {
			scheme = "http"
		}
	}
	return scheme + "://" + request.Host
}

func normalizedBrowserPath(requestPath string) string {
	cleaned := path.Clean("/" + strings.TrimPrefix(requestPath, "/"))
	if cleaned == "." || cleaned == "" {
		return "/"
	}
	return cleaned
}

func isSingleSegmentChild(requestPath string, parent string) bool {
	prefix := parent + "/"
	if !strings.HasPrefix(requestPath, prefix) {
		return false
	}
	child := strings.TrimPrefix(requestPath, prefix)
	return child != "" && !strings.Contains(child, "/")
}

func isKnownSystemSettingsRoute(requestPath string) bool {
	const prefix = "/system-settings/"
	if !strings.HasPrefix(requestPath, prefix) {
		return false
	}
	parts := strings.Split(strings.TrimPrefix(requestPath, prefix), "/")
	if len(parts) < 1 || len(parts) > 2 {
		return false
	}
	_, knownSection := systemSettingsSections[parts[0]]
	return knownSection && (len(parts) == 1 || parts[1] != "")
}

func isKnownBrowserRoute(requestPath string) bool {
	requestPath = normalizedBrowserPath(requestPath)
	if _, ok := knownBrowserExactRoutes[requestPath]; ok {
		return true
	}
	return isSingleSegmentChild(requestPath, "/oauth") ||
		isSingleSegmentChild(requestPath, "/pricing") ||
		isSingleSegmentChild(requestPath, "/usage-logs") ||
		isSingleSegmentChild(requestPath, "/models") ||
		isSingleSegmentChild(requestPath, "/errors") ||
		isSingleSegmentChild(requestPath, "/dashboard") ||
		isSingleSegmentChild(requestPath, "/chat") ||
		isSingleSegmentChild(requestPath, "/console/chat") ||
		requestPath == "/console/chat" ||
		isKnownSystemSettingsRoute(requestPath)
}

func isIndexableBrowserRoute(requestPath string) bool {
	requestPath = normalizedBrowserPath(requestPath)
	return requestPath == "/" || requestPath == "/pricing" || isSingleSegmentChild(requestPath, "/pricing")
}

func canonicalPath(requestPath string) string {
	requestPath = normalizedBrowserPath(requestPath)
	if requestPath == "/" {
		return "/"
	}
	if requestPath == "/pricing" || isSingleSegmentChild(requestPath, "/pricing") {
		return strings.TrimRight(requestPath, "/") + "/"
	}
	return requestPath
}

func metadataForBrowserPath(requestPath string, baseURL string, found bool) seoMetadata {
	requestPath = normalizedBrowserPath(requestPath)
	metadata := seoMetadata{
		Title:       "Fast API 控制台｜统一 AI API 网关｜New API",
		Description: "Fast API 提供基于 New API 的统一 AI API 网关与管理控制台。",
		Canonical:   baseURL + canonicalPath(requestPath),
		Robots:      "noindex, nofollow",
		PageType:    "WebPage",
	}

	if !found {
		metadata.Title = "页面未找到｜Fast API｜New API"
		metadata.Description = "你访问的页面不存在。返回 Fast API 首页继续浏览统一 AI API 服务。"
		return metadata
	}

	if requestPath == "/" {
		metadata.Title = "Fast API｜Claude、GPT、Gemini API 中转与统一接口｜New API"
		metadata.Description = "Fast API 为开发者提供 Claude、OpenAI GPT、Gemini 等模型的统一 API 接入，兼容 OpenAI、Anthropic 与 Gemini 协议，支持 API Key 管理、用量日志和透明计费。"
		metadata.Robots = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
		metadata.PageType = "WebSite"
		return metadata
	}

	if requestPath == "/pricing" || isSingleSegmentChild(requestPath, "/pricing") {
		metadata.Title = "Claude、GPT、Gemini API 价格与模型列表｜Fast API｜New API"
		metadata.Description = "查看 Fast API 支持的 Claude、OpenAI GPT、Gemini 等模型价格、计费单位与可用分组，选择适合开发和 AI 编程工具的统一 API。"
		metadata.Robots = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
		metadata.PageType = "CollectionPage"
	}
	return metadata
}

func replaceSEOBlock(page []byte, startMarker string, endMarker string, replacement string) []byte {
	start := bytes.Index(page, []byte(startMarker))
	if start < 0 {
		return page
	}
	endRelative := bytes.Index(page[start:], []byte(endMarker))
	if endRelative < 0 {
		return page
	}
	end := start + endRelative + len(endMarker)

	result := make([]byte, 0, len(page)+len(replacement))
	result = append(result, page[:start]...)
	result = append(result, replacement...)
	result = append(result, page[end:]...)
	return result
}

func structuredData(metadata seoMetadata, baseURL string) string {
	if metadata.Robots == "noindex, nofollow" {
		return ""
	}

	data := map[string]any{
		"@context": "https://schema.org",
		"@graph": []map[string]any{
			{
				"@type":       "WebSite",
				"@id":         baseURL + "/#website",
				"name":        "Fast API",
				"url":         baseURL + "/",
				"description": metadata.Description,
				"inLanguage":  "zh-CN",
			},
			{
				"@type":               "SoftwareApplication",
				"@id":                 baseURL + "/#application",
				"name":                "Fast API",
				"url":                 baseURL + "/",
				"applicationCategory": "DeveloperApplication",
				"operatingSystem":     "Web",
				"description":         metadata.Description,
				"isBasedOn":           "https://github.com/QuantumNous/new-api",
			},
		},
	}
	encoded, err := common.Marshal(data)
	if err != nil {
		return ""
	}
	return string(encoded)
}

func buildSEOHead(metadata seoMetadata, baseURL string) string {
	escapedTitle := html.EscapeString(metadata.Title)
	escapedDescription := html.EscapeString(metadata.Description)
	escapedCanonical := html.EscapeString(metadata.Canonical)
	escapedRobots := html.EscapeString(metadata.Robots)
	escapedImage := html.EscapeString(baseURL + "/logo.png")

	var builder strings.Builder
	builder.WriteString("<meta name=\"seo-managed\" content=\"true\" />\n")
	builder.WriteString("<meta name=\"robots\" content=\"")
	builder.WriteString(escapedRobots)
	builder.WriteString("\" />\n")
	builder.WriteString("<meta name=\"googlebot\" content=\"")
	builder.WriteString(escapedRobots)
	builder.WriteString("\" />\n")
	builder.WriteString("<link rel=\"canonical\" href=\"")
	builder.WriteString(escapedCanonical)
	builder.WriteString("\" />\n")
	builder.WriteString("<meta property=\"og:type\" content=\"website\" />\n")
	builder.WriteString("<meta property=\"og:locale\" content=\"zh_CN\" />\n")
	builder.WriteString("<meta property=\"og:site_name\" content=\"Fast API\" />\n")
	builder.WriteString("<meta property=\"og:title\" content=\"")
	builder.WriteString(escapedTitle)
	builder.WriteString("\" />\n")
	builder.WriteString("<meta property=\"og:description\" content=\"")
	builder.WriteString(escapedDescription)
	builder.WriteString("\" />\n")
	builder.WriteString("<meta property=\"og:url\" content=\"")
	builder.WriteString(escapedCanonical)
	builder.WriteString("\" />\n")
	builder.WriteString("<meta property=\"og:image\" content=\"")
	builder.WriteString(escapedImage)
	builder.WriteString("\" />\n")
	builder.WriteString("<meta name=\"twitter:card\" content=\"summary\" />\n")
	builder.WriteString("<meta name=\"twitter:title\" content=\"")
	builder.WriteString(escapedTitle)
	builder.WriteString("\" />\n")
	builder.WriteString("<meta name=\"twitter:description\" content=\"")
	builder.WriteString(escapedDescription)
	builder.WriteString("\" />\n")
	builder.WriteString("<meta name=\"twitter:image\" content=\"")
	builder.WriteString(escapedImage)
	builder.WriteString("\" />\n")

	if jsonLD := structuredData(metadata, baseURL); jsonLD != "" {
		builder.WriteString("<script type=\"application/ld+json\">")
		builder.WriteString(jsonLD)
		builder.WriteString("</script>\n")
	}
	return builder.String()
}

func injectSEOMetadata(page []byte, requestPath string, baseURL string, found bool) ([]byte, seoMetadata) {
	metadata := metadataForBrowserPath(requestPath, baseURL, found)
	page = replaceSEOBlock(
		page,
		seoTitleStart,
		seoTitleEnd,
		fmt.Sprintf("<title>%s</title>", html.EscapeString(metadata.Title)),
	)
	page = replaceSEOBlock(
		page,
		seoDescriptionStart,
		seoDescriptionEnd,
		fmt.Sprintf("<meta name=\"description\" content=\"%s\" />", html.EscapeString(metadata.Description)),
	)
	page = bytes.Replace(page, []byte(seoHeadMarker), []byte(buildSEOHead(metadata, baseURL)), 1)
	return page, metadata
}
