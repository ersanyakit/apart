package main

import (
	"encoding/json"
	"os"
	"otel/constants"
)

func main() {
	messages := map[string]string{}
	for code, message := range constants.ErrorMessages {
		messages[code] = message
	}
	value := map[string]any{"application": constants.APPLICATION_NAME, "brandName": constants.BrandName, "brandURL": constants.BrandURL, "version": constants.COMMAND_VERSION, "application_version": constants.APPLICATION_VERSION, "commands": constants.CommandMethods, "languages": constants.SupportedLanguages(), "errors": messages}
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		panic(err)
	}
	path := "ui/src/lib/contracts.generated.json"
	if len(os.Args) > 1 {
		path = os.Args[1]
	}
	if err := os.WriteFile(path, append(data, '\n'), 0644); err != nil {
		panic(err)
	}
}
