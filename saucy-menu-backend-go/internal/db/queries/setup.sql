-- name: ListActiveLanguages :many
SELECT id, code, name, flag, is_active, sort_order
FROM languages
WHERE is_active = true
ORDER BY sort_order ASC;

-- name: ListCurrencies :many
SELECT id, code, name, symbol
FROM currencies;
