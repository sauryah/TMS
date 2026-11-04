# Build Stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server cmd/server/main.go

# Test Stage
FROM builder AS test
RUN CGO_ENABLED=0 go test -v ./...

# Production Stage
FROM alpine:3.20
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .

RUN addgroup -S tmsuser && adduser -S tmsuser -G tmsuser \
    && chown -R tmsuser:tmsuser /app

USER tmsuser

EXPOSE 8080
CMD ["./server"]
