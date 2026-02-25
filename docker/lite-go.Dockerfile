FROM golang:1.23-alpine AS builder
WORKDIR /src/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/tdp-api ./cmd/tdp-api && \
    CGO_ENABLED=0 GOOS=linux go build -o /out/tdp-worker ./cmd/tdp-worker

FROM alpine:3.20 AS base
RUN apk add --no-cache ca-certificates && \
    adduser -D -H -u 10001 appuser
USER appuser

FROM base AS api
COPY --from=builder /out/tdp-api /usr/local/bin/tdp-api
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/tdp-api"]

FROM base AS worker
COPY --from=builder /out/tdp-worker /usr/local/bin/tdp-worker
ENTRYPOINT ["/usr/local/bin/tdp-worker"]
