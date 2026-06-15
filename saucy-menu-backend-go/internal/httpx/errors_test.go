package httpx

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAppErrorStatusAndMessage(t *testing.T) {
	e := NewAppError(404, "not found")
	require.Equal(t, 404, e.Status)
	require.Equal(t, "not found", e.Error())
}

func TestStatusFromPlainErrorIs500(t *testing.T) {
	status, msg := StatusAndMessage(errors.New("boom"))
	require.Equal(t, 500, status)
	require.Equal(t, "boom", msg)
}

func TestStatusFromAppError(t *testing.T) {
	status, msg := StatusAndMessage(NewAppError(400, "bad"))
	require.Equal(t, 400, status)
	require.Equal(t, "bad", msg)
}
