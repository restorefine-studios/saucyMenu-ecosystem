package httpx

// AppError carries an HTTP status code alongside an error message.
// Mirrors the Elysia onError behaviour: AppError status wins, plain errors → 500.
type AppError struct {
	Status  int
	Message string
}

func (e *AppError) Error() string { return e.Message }

func NewAppError(status int, message string) *AppError {
	return &AppError{Status: status, Message: message}
}

// StatusAndMessage extracts an HTTP status and client-facing message from any error.
func StatusAndMessage(err error) (int, string) {
	if ae, ok := err.(*AppError); ok {
		return ae.Status, ae.Message
	}
	return 500, err.Error()
}
