package router

import (
	"encoding/xml"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func withServerAddress(t *testing.T, address string) {
	t.Helper()
	previous := system_setting.ServerAddress
	system_setting.ServerAddress = address
	t.Cleanup(func() {
		system_setting.ServerAddress = previous
	})
}

func performSEORequest(t *testing.T, target string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	registerSEORoutes(engine)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, target, nil)
	engine.ServeHTTP(recorder, request)
	return recorder
}

func TestSEOEndpointsServeValidDocuments(t *testing.T) {
	withServerAddress(t, "https://www.fastapi.ltd/path?ignored=true")

	robots := performSEORequest(t, "/robots.txt")
	require.Equal(t, http.StatusOK, robots.Code)
	assert.Contains(t, robots.Header().Get("Content-Type"), "text/plain")
	assert.Contains(t, robots.Body.String(), "Sitemap: https://www.fastapi.ltd/sitemap.xml")
	assert.NotContains(t, strings.ToLower(robots.Body.String()), "<!doctype html>")

	sitemap := performSEORequest(t, "/sitemap.xml")
	require.Equal(t, http.StatusOK, sitemap.Code)
	assert.Contains(t, sitemap.Header().Get("Content-Type"), "application/xml")
	assert.Contains(t, sitemap.Body.String(), "<loc>https://www.fastapi.ltd/</loc>")
	assert.Contains(t, sitemap.Body.String(), "<loc>https://www.fastapi.ltd/pricing/</loc>")
	var document struct {
		XMLName xml.Name `xml:"urlset"`
		URLs    []struct {
			Location string `xml:"loc"`
		} `xml:"url"`
	}
	require.NoError(t, xml.Unmarshal(sitemap.Body.Bytes(), &document))
	assert.Len(t, document.URLs, 2)
}

func TestInjectSEOMetadataBuildsIndexableHomePage(t *testing.T) {
	page := []byte(`
<html><head>
<!-- SEO_TITLE_START --><title>New API</title><!-- SEO_TITLE_END -->
<!-- SEO_DESCRIPTION_START --><meta name="description" content="default"><!-- SEO_DESCRIPTION_END -->
<!-- SEO_HEAD -->
</head></html>`)

	rendered, metadata := injectSEOMetadata(page, "/", "https://www.fastapi.ltd", true)
	html := string(rendered)

	assert.Equal(t, "https://www.fastapi.ltd/", metadata.Canonical)
	assert.Contains(t, metadata.Robots, "index, follow")
	assert.Contains(t, html, "Fast API｜Claude、GPT、Gemini API 中转与统一接口｜New API")
	assert.Contains(t, html, `<link rel="canonical" href="https://www.fastapi.ltd/" />`)
	assert.Contains(t, html, `name="seo-managed"`)
	assert.Contains(t, html, `application/ld+json`)
	assert.NotContains(t, html, seoHeadMarker)
}

func TestInjectSEOMetadataNoindexesPrivateAndMissingRoutes(t *testing.T) {
	page := []byte(`
<!-- SEO_TITLE_START --><title>New API</title><!-- SEO_TITLE_END -->
<!-- SEO_DESCRIPTION_START --><meta name="description" content="default"><!-- SEO_DESCRIPTION_END -->
<!-- SEO_HEAD -->`)

	privatePage, privateMetadata := injectSEOMetadata(page, "/sign-in", "https://www.fastapi.ltd", true)
	assert.Equal(t, "noindex, nofollow", privateMetadata.Robots)
	assert.Contains(t, string(privatePage), `name="robots" content="noindex, nofollow"`)

	missingPage, missingMetadata := injectSEOMetadata(page, "/missing", "https://www.fastapi.ltd", false)
	assert.Equal(t, "页面未找到｜Fast API｜New API", missingMetadata.Title)
	assert.Equal(t, "noindex, nofollow", missingMetadata.Robots)
	assert.NotContains(t, string(missingPage), `application/ld+json`)
}

func TestBrowserRouteClassification(t *testing.T) {
	tests := []struct {
		path      string
		known     bool
		indexable bool
	}{
		{path: "/", known: true, indexable: true},
		{path: "/pricing/", known: true, indexable: true},
		{path: "/pricing/claude-sonnet", known: true, indexable: true},
		{path: "/sign-in", known: true, indexable: false},
		{path: "/console/log", known: true, indexable: false},
		{path: "/dashboard/overview", known: true, indexable: false},
		{path: "/oauth/github", known: true, indexable: false},
		{path: "/system-settings/site/branding", known: true, indexable: false},
		{path: "/console/chat/session-id", known: true, indexable: false},
		{path: "/404", known: true, indexable: false},
		{path: "/pricing-imposter", known: false, indexable: false},
		{path: "/pricing/model/extra", known: false, indexable: false},
		{path: "/about/extra", known: false, indexable: false},
		{path: "/system-settings/unknown", known: false, indexable: false},
		{path: "/console/unknown", known: false, indexable: false},
		{path: "/missing-seo-test", known: false, indexable: false},
	}

	for _, test := range tests {
		t.Run(test.path, func(t *testing.T) {
			assert.Equal(t, test.known, isKnownBrowserRoute(test.path))
			assert.Equal(t, test.indexable, isIndexableBrowserRoute(test.path))
		})
	}
}

func TestCanonicalPathNormalizesPublicRoutes(t *testing.T) {
	assert.Equal(t, "/", canonicalPath("/"))
	assert.Equal(t, "/pricing/", canonicalPath("/pricing"))
	assert.Equal(t, "/pricing/claude-sonnet/", canonicalPath("/pricing/claude-sonnet/"))
	assert.Equal(t, "/sign-in", canonicalPath("/sign-in/"))
}
