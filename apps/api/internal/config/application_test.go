package config

import "testing"

func TestResolveServerAddr(t *testing.T) {
	tests := []struct {
		name           string
		configuredAddr string
		port           string
		want           string
		wantErr        bool
	}{
		{name: "render port overrides configured address", configuredAddr: ":8091", port: "10000", want: ":10000"},
		{name: "configured address is used without port", configuredAddr: "127.0.0.1:9000", want: "127.0.0.1:9000"},
		{name: "default address is used when both are empty", want: ":8091"},
		{name: "invalid port is rejected", configuredAddr: ":8091", port: "not-a-port", wantErr: true},
		{name: "out of range port is rejected", configuredAddr: ":8091", port: "65536", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveServerAddr(tt.configuredAddr, tt.port)
			if tt.wantErr {
				if err == nil {
					t.Fatal("resolveServerAddr() error = nil, want error")
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveServerAddr() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("resolveServerAddr() = %q, want %q", got, tt.want)
			}
		})
	}
}
