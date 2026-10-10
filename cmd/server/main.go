package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"Status":"ok"}`)
	})

	log.Println("Listening on :8091")
	log.Fatal(http.ListenAndServe(":8091", mux))
}
