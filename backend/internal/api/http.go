package api

import (
	"encoding/json"
	"net/http"
)

type APIError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Retryable bool   `json:"retryable"`
	RequestID string `json:"requestId,omitempty"`
}

type errorEnvelope struct {
	Error APIError `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code, message string, retryable bool, requestID string) {
	writeJSON(w, status, errorEnvelope{
		Error: APIError{
			Code:      code,
			Message:   message,
			Retryable: retryable,
			RequestID: requestID,
		},
	})
}

func decodeJSON(r *http.Request, out any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(out)
}
