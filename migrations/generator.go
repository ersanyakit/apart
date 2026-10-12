package migrations

import (
	"fmt"
	"os"
	"otel/constants"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

var validName = regexp.MustCompile(`^[a-z][a-z0-9_]{0,80}$`)

func Generate(directory, name string) (string, error) {
	if !validName.MatchString(name) {
		return "", constants.ErrMigrationName
	}
	version := strings.ReplaceAll(time.Now().UTC().Format("20060102_150405.000000000"), ".", "_") + "_" + name
	if err := os.MkdirAll(directory, 0755); err != nil {
		return "", constants.Wrap(constants.ErrMigration, err)
	}
	path := filepath.Join(directory, version+".go")
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if os.IsExist(err) {
		return "", constants.ErrMigrationExists
	}
	if err != nil {
		return "", constants.Wrap(constants.ErrMigration, err)
	}
	defer file.Close()
	_, err = fmt.Fprintf(file, `package migrations

import (
	"otel/constants"
	"gorm.io/gorm"
)

func init() {
	Register(Migration{
		Version: %q,
		Up: func(tx *gorm.DB) error {
			// Use tx.Migrator() to apply this schema change.
			return constants.ErrMigrationUnimplemented
		},
		Down: func(tx *gorm.DB) error {
			// Reverse exactly the change introduced in Up.
			return constants.ErrMigrationUnimplemented
		},
	})
}
`, version)
	if err != nil {
		return "", constants.Wrap(constants.ErrMigration, err)
	}
	return path, nil
}
