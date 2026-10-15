package main

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestGeneratedContractsAreCurrent(t *testing.T) {
	dir := t.TempDir()
	if out, err := exec.Command("go", "run", ".", filepath.Join(dir, "contracts.generated.json")).CombinedOutput(); err != nil {
		t.Fatalf("generate: %v\n%s", err, out)
	}
	for _, name := range []string{"contracts.generated.json", "statuses.generated.ts"} {
		generated, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatal(err)
		}
		committed, err := os.ReadFile(filepath.Join("../../ui/src/lib", name))
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(generated, committed) {
			t.Fatalf("%s is stale; run go run ./cmd/contracts", name)
		}
	}
}
