package admin

import (
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/storage"
)

const maxUploadSize = 5 << 20 // 5MB, matches the frontend's existing limit

type UploadHandler struct {
	storage *storage.Client
}

func NewUploadHandler(s *storage.Client) *UploadHandler {
	return &UploadHandler{storage: s}
}

// POST /admin/upload — multipart form with "file" + "folder" fields.
func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	if h.storage == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "file storage is not configured")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize+1<<20) // small overhead for multipart framing
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "file exceeds the 5MB limit")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "missing file")
		return
	}
	defer file.Close()

	if header.Size > maxUploadSize {
		httpx.WriteError(w, http.StatusBadRequest, "file exceeds the 5MB limit")
		return
	}

	contentType := header.Header.Get("Content-Type")
	// Some browsers (and canvas.toBlob wrappers) omit Content-Type on the
	// multipart part. Fall back to MIME detection by file extension.
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(header.Filename))
	}
	if !strings.HasPrefix(contentType, "image/") {
		httpx.WriteError(w, http.StatusBadRequest, "only image uploads are allowed")
		return
	}

	folder := r.FormValue("folder")
	if folder == "" {
		folder = "uploads"
	}

	key := folder + "/" + uuid.NewString() + filepath.Ext(header.Filename)

	if err := h.storage.Upload(r.Context(), key, file, contentType); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "upload failed")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"success": true,
		"key":     key,
		"message": "Successfully uploaded",
	})
}

// DELETE /admin/upload/{key} — key may contain slashes (folder/filename).
func (h *UploadHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if h.storage == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "file storage is not configured")
		return
	}

	key := chi.URLParam(r, "key")
	if key == "" {
		httpx.WriteError(w, http.StatusBadRequest, "missing key")
		return
	}

	if err := h.storage.Delete(r.Context(), key); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "delete failed")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Deleted",
	})
}
