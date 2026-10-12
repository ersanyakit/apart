package persistence

import (
	"otel/constants"
	"otel/internal/domain/identity"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type JWT struct{ Secret []byte }

func (j JWT) Issue(c identity.TokenClaims) (string, error) {
	claims := jwt.RegisteredClaims{Issuer: constants.APPLICATION_NAME, Audience: jwt.ClaimStrings{constants.APPLICATION_NAME}, Subject: c.UserID.String(), ID: c.SessionID, ExpiresAt: jwt.NewNumericDate(c.ExpiresAt), IssuedAt: jwt.NewNumericDate(time.Now()), NotBefore: jwt.NewNumericDate(time.Now())}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(j.Secret)
}
func (j JWT) Verify(value string) (identity.TokenClaims, error) {
	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(value, claims, func(*jwt.Token) (any, error) { return j.Secret, nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer(constants.APPLICATION_NAME), jwt.WithAudience(constants.APPLICATION_NAME), jwt.WithExpirationRequired(), jwt.WithIssuedAt())
	if err != nil || !token.Valid || claims.ID == "" {
		return identity.TokenClaims{}, constants.ErrUnauthorized
	}
	id, err := uuid.Parse(claims.Subject)
	if err != nil {
		return identity.TokenClaims{}, constants.ErrUnauthorized
	}
	return identity.TokenClaims{UserID: id, SessionID: claims.ID, ExpiresAt: claims.ExpiresAt.Time}, nil
}

type Bcrypt struct{}

func (Bcrypt) Hash(value string) (string, error) {
	if len(value) < 12 || len(value) > 72 {
		return "", constants.ErrPassword
	}
	v, err := bcrypt.GenerateFromPassword([]byte(value), 12)
	return string(v), err
}
func (Bcrypt) Compare(hash, value string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(value)) == nil
}
