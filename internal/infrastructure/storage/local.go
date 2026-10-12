package storage

import (
	"context"
	"io"
	"os"
	"otel/constants"
	"path/filepath"
	"strings"
)

type Local struct{ Root string }

func (s Local) path(key string) (string, error) {
	if key == "" || key == "." || key == ".." || strings.ContainsAny(key, "/\\") {
		return "", constants.ErrStorageKey
	}
	return filepath.Join(s.Root, key), nil
}
func (s Local) Put(ctx context.Context, key string, reader io.Reader) error {
	path, err := s.path(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(s.Root, 0700); err != nil {
		return constants.Wrap(constants.ErrStorage, err)
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return constants.Wrap(constants.ErrStorage, err)
	}
	_, err = io.Copy(file, &contextReader{ctx: ctx, reader: reader})
	closeErr := file.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		os.Remove(path)
		return constants.Wrap(constants.ErrStorage, err)
	}
	return nil
}
func (s Local) Delete(ctx context.Context, key string) error {
	path, err := s.path(key)
	if err != nil {
		return err
	}
	err = os.Remove(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return constants.Wrap(constants.ErrStorage, err)
	}
	return nil
}
func (s Local) Open(ctx context.Context, key string) (io.ReadSeekCloser, error) {
	path, err := s.path(key)
	if err != nil {
		return nil, err
	}
	file, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, constants.ErrNotFound
	}
	if err != nil {
		return nil, constants.Wrap(constants.ErrStorage, err)
	}
	return file, nil
}

type contextReader struct {
	ctx    context.Context
	reader io.Reader
}

func (r *contextReader) Read(p []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.reader.Read(p)
}
