# Shoutrrr Comprehensive Research Report

**Date:** March 26, 2026
**Repository:** https://github.com/containrrr/shoutrrr
**License:** MIT
**Language:** Go

---

## 1. Core Purpose & Use Cases

**What It Does:**
Shoutrrr is a "notification library for gophers and their furry friends," inspired by the Apprise project. It enables Go developers to send notifications across 20+ different services through a unified, URL-based configuration interface.

**Primary Use Cases:**
- Sending deployment notifications from CI/CD pipelines
- Application alerts and monitoring notifications
- Docker container orchestration notifications (used by Watchtower)
- Kubernetes automation notifications (used by Kured)
- Batch notification delivery to multiple services simultaneously
- Custom webhook integration for unsupported services

**Integration Patterns:**
1. **Direct Send:** Simple one-line API calls (`shoutrrr.Send(url, message)`)
2. **Sender Objects:** Reusable instances for managing multiple services with queuing
3. **CLI Tool:** Command-line interface for shell scripts and automation
4. **GitHub Actions:** Native workflow integration for CI/CD automation

---

## 2. Supported Notification Services

### Complete Service List (20+ Services)

**Communication Platforms:**
- Slack (Webhooks & Bot API)
- Discord (Webhooks)
- Telegram (Bot API)
- Microsoft Teams
- Mattermost
- RocketChat
- Zulip Chat
- Google Chat
- Matrix

**Alert & Monitoring Services:**
- Gotify (self-hosted)
- Ntfy (public + self-hosted)
- Pushover (mobile push notifications)
- PushBullet
- OpsGenie
- Bark

**Messaging & Integration:**
- IFTTT (If This Then That)
- Join (cross-device messaging)
- Email (SMTP)
- Logger (Go logging framework)

**Generic Services:**
- Generic Webhook (custom HTTP POST endpoints)
- Custom services via Generic + template engine

### URL Scheme Format Examples

```
slack://xoxb:TOKEN@CHANNEL_ID?color=good&title=Alert
discord://TOKEN@WEBHOOK_ID?color=0x50D9ff&splitlines=yes
telegram://TOKEN@telegram?chats=CHAT_ID&parsemode=HTML
teams://WEBHOOK_URL
mattermost://TOKEN@DOMAIN/TEAM/CHANNEL
rocketchat://USERNAME:PASSWORD@DOMAIN:PORT/CHANNEL
matrix://USERID:PASSWORD@HOMESERVER/ROOMID
email://USERNAME:PASSWORD@SMTP_HOST:PORT?to=EMAIL@DOMAIN
generic+https://example.com/api/webhook?@header=value&$custom=data
```

---

## 3. Architecture & Internal Structure

### Package Organization

The library follows Go best practices with modular separation:

**Core Packages (`pkg/` directory):**

- **`pkg/router`** - ServiceRouter manages message routing to services
  - URL parsing and service discovery
  - Service initialization from notification URLs
  - Message dispatching (synchronous & asynchronous)
  - Timeout handling (default 10 seconds per service)
  - Queue-based batch message sending

- **`pkg/services`** - Individual service implementations
  - Each service has its own subdirectory (slack/, discord/, telegram/, etc.)
  - Implements common Service interface
  - Custom URL parsing per service
  - Service-specific parameter handling

- **`pkg/types`** - Core interfaces and data types
  - `Sender` interface (core notification sending)
  - `Service` interface (service-specific implementation)
  - `RichSender` interface (rich message support)
  - `Templater` interface (message templating)
  - `StdLogger` interface (logging abstraction)
  - Data structures for notification payloads

- **`pkg/format`** - Message formatting utilities
  - Template engine for message composition
  - Format conversion (plain text, JSON, HTML, Markdown)
  - Message enrichment and transformation

- **`pkg/generators`** - Code generation utilities
  - CLI command generation
  - Service URL generation helpers
  - Configuration builder utilities

- **`pkg/util`** - Utility functions
  - URL parsing and validation
  - Error handling utilities
  - Encoding/decoding helpers

### Routing Architecture

**Service Discovery & Initialization:**
1. Extract scheme from notification URL (e.g., `slack://...` → scheme = `slack`)
2. Route to appropriate service handler via `newService(scheme)`
3. Initialize service with URL credentials and parameters
4. Service validates and stores configuration

**Message Routing Flow:**
1. User calls `Send(rawURL, message)` or `sender.Send(message)`
2. ServiceRouter routes message to each configured service
3. Each service formats message according to its API requirements
4. Concurrent delivery via goroutines with timeout protection
5. Error collection and return to caller

**Queue-Based Batch Operations:**
```
Enqueue(message) → [queue] → Flush() → [send all queued messages]
```

---

## 4. URL Scheme Format & Parsing

### Generic URL Structure

```
<scheme>://<credentials>@<host>/<path>?<params>
```

### Standard Parameter Types

**Query Parameters (all services):**
- Standard query parameters passed to remote service
- Reserved params can be escaped with underscore prefix (`_paramName`)
- Custom parameters prefixed with `$` (injected into JSON templates)
- HTTP headers added with `@` prefix (e.g., `@Authorization=Bearer token`)

### Slack URL Format (Example)

**Bot API:**
```
slack://xoxb:TOKEN@CHANNEL_ID?color=good&title=Alert
  - Token prefix: xoxb = bot token
  - Channel format: Cxxxxxxxxxx (Slack channel ID)
  - Parameters: color, title, botname (username), icon, threadts
```

**Webhook:**
```
slack://hook:WEBHOOK_TOKEN@webhook?color=good
  - Token prefix: hook = webhook
  - Color format: CSS color names or hex (#FF0000)
```

### Discord URL Format (Example)

```
discord://TOKEN@WEBHOOK_ID?color=0x50D9ff&splitlines=yes
  - Token: Webhook authentication token
  - WebhookID: Discord webhook identifier
  - Parameters: color, username, avatar, debug/error/info/warning colors, splitlines
```

### Telegram URL Format (Example)

```
telegram://TOKEN@telegram?chats=CHAT_ID&parsemode=HTML&preview=yes
  - Token: BotFather token
  - Chats: One or more chat IDs or @channel_names
  - ParseMode: None, Markdown, HTML, MarkdownV2
  - Notification: Enable/disable silent delivery
  - Preview: Enable/disable web preview
```

### Generic Webhook Format

```
generic+https://example.com/api/webhook?template=json&@custom-header=value&$field=value
  - Uses generic+ prefix
  - Supports JSON template with configurable field names (titleKey, messageKey)
  - Custom HTTP headers via @ prefix
  - Extra JSON fields via $ prefix
```

---

## 5. Key Features & Capabilities

### Message Templates

**Template Engine:**
- Go template support for message composition
- Built-in JSON template (`template=json`)
- Customizable JSON field names via `titleKey` and `messageKey` parameters
- Title/message composition from various sources

**Template Variables:**
```go
// Available in templates
type MessageData struct {
    Title   string
    Message string
    // Custom fields can be added via $ prefixed parameters
}
```

### Custom HTTP Headers

**Via Generic Service:**
```
generic+https://api.example.com/notify?@Authorization=Bearer%20token&@Accept-Language=en-US
```

### Message Formatting Features

**Per-Service Capabilities:**
- **Slack:** Thread support (ThreadTS), emoji/URL icons, bordered messages (color)
- **Discord:** Embedded messages with colors, split-line delivery, avatar override
- **Telegram:** Multiple parse modes (HTML, Markdown, MarkdownV2), web preview control
- **Email:** Rich HTML support, multiple recipients
- **Generic:** Fully customizable JSON/HTML payloads via templates

### Batch Operations

**Sender Queue API:**
```go
sender, _ := shoutrrr.CreateSender(url1, url2, url3)
sender.Enqueue("Alert 1", params)
sender.Enqueue("Alert 2", params)
sender.Flush()  // Send all queued messages
```

### Timeout Protection

- Default 10-second timeout per service
- Configurable via context/logger
- Prevents hanging notifications from blocking entire operation

### Concurrent Delivery

- `SendAsync()` launches goroutines for each service
- Non-blocking batch notifications
- Timeout-protected channel-based orchestration

---

## 6. API Surface & Exported Functions

### Main Package Interface

**Direct Send (Simple Case):**
```go
func Send(rawURL string, message string) error
```
Sends notification directly. Returns error if service not found or send fails.

**Create Sender (Advanced Case):**
```go
func CreateSender(rawURLs ...string) (*router.ServiceRouter, error)
```
Creates reusable Sender for multiple URLs with queue support.

**Custom Logger Sender:**
```go
func NewSender(logger types.StdLogger, serviceURLs ...string) (*router.ServiceRouter, error)
```
Creates Sender with custom logger for diagnostics.

**Global Configuration:**
```go
func SetLogger(logger types.StdLogger)
```
Configures logging for default router instance.

**Version Info:**
```go
func Version() string
```
Returns Shoutrrr version.

### ServiceRouter Methods

```go
type ServiceRouter struct {
    Send(message string, params map[string]string) error
    SendAsync(message string, params map[string]string) error
    Enqueue(message string, params map[string]string)
    Flush() error
    AddService(rawURL string) error
    ListServices() map[string]types.Service
    Locate(serviceName string) (types.Service, error)
}
```

### Core Interfaces

**Sender Interface:**
```go
type Sender interface {
    Send(message string, params map[string]string) error
}
```

**Service Interface:**
```go
type Service interface {
    Sender
    Templater
    Initialize(rawURL string, logger StdLogger) error
    SetLogger(logger StdLogger)
}
```

**RichSender Interface:**
```go
type RichSender interface {
    Sender
    SendMessage(MessageItem ...MessageItem) error
}
```

**Templater Interface:**
```go
type Templater interface {
    GetTemplateData() TemplateData
}
```

---

## 7. Configuration & Service Setup

### Per-Service Configuration

**Slack Configuration:**
- Bot Token or Webhook Token
- Target Channel ID
- Optional: BotName, Color, Icon, ThreadTS, Title

**Discord Configuration:**
- Webhook Token
- Webhook ID
- Optional: Username, Avatar, Color (per message type), SplitLines

**Telegram Configuration:**
- Bot Token (from BotFather)
- Chat IDs or Channel Names (@channel)
- Optional: ParseMode, Notification, Preview, Title

**Email Configuration:**
- SMTP Host:Port
- Username/Password
- Recipients (via `to` parameter)
- Optional: From address, Subject

**Generic Webhook:**
- Target HTTP endpoint URL
- Optional: Template type, HTTP headers, JSON field mappings, custom data fields

### URL Verification

**CLI Command:**
```bash
shoutrrr verify <URL>
```
Validates URL format without sending.

**Programmatic Verification:**
```go
err := shoutrrr.Send("", "")  // Verify URL parsing
```

### URL Generation

**CLI Helper:**
```bash
shoutrrr generate <service> [options]
```
Interactive URL builder for service URLs.

---

## 8. Error Handling Patterns

### Error Return Model

All Shoutrrr functions follow standard Go error return pattern:

```go
url := "slack://invalid"
err := shoutrrr.Send(url, "message")
if err != nil {
    // Handle: service not found, URL parse error, send failure
}
```

### Common Error Scenarios

1. **Invalid URL Format:** Service not recognized, missing required fields
2. **Credentials:** Invalid tokens, expired credentials, authentication failures
3. **Service Unavailable:** Network errors, timeout (10s default), service downtime
4. **Message Rejection:** Rate limiting, message too large, format validation failures
5. **Partial Failures:** One service fails in batch operation (others may succeed)

### Error Recovery Strategies

**Timeout Handling:**
- Default 10-second channel timeout per service
- Non-blocking async operations with `SendAsync()`
- Caller can implement retry logic using standard Go patterns

**Batch Graceful Degradation:**
- ServiceRouter continues to remaining services if one fails
- All errors collected and returned as error
- Individual service failures don't block other services

**Validation:**
- URL verification before sending
- Early parse-time detection of configuration errors
- Pre-flight checks via `Verify` command

---

## 9. Integration Points & Extension Patterns

### Custom Service Implementation

Implement `types.Service` interface:
```go
type CustomService struct {}
func (s *CustomService) Initialize(rawURL string, logger types.StdLogger) error {}
func (s *CustomService) Send(message string, params map[string]string) error {}
func (s *CustomService) SetLogger(logger types.StdLogger) {}
func (s *CustomService) GetTemplateData() TemplateData {}
```

### Using Generic Service

For unsupported services, use Generic webhook:
```
generic+https://api.custom-service.com/notify?template=json&@Authorization=Bearer%20token
```

### Logger Integration

```go
type StdLogger interface {
    Printf(format string, v ...interface{})
    Println(v ...interface{})
}

shoutrrr.SetLogger(myLogger)
```

### Batch Notifications

```go
sender, _ := shoutrrr.CreateSender(slackURL, discordURL, telegramURL)
sender.Send("Hello", nil)  // Send to all 3 services
```

---

## 10. Real-World Usage Examples

### Simple Alert Notification

```bash
shoutrrr send "slack://token@channel" "Deployment complete"
```

### Batch Delivery to Multiple Channels

```bash
shoutrrr send \
  "slack://token1@channel1" \
  "slack://token2@channel2" \
  "discord://token@webhook" \
  "Deployment alert"
```

### GitHub Actions Integration

```yaml
- uses: containrrr/shoutrrr-action@v1
  with:
    url: slack://token@channel
    title: Deployment Status
    message: Build successful
```

### Go Package Usage

```go
package main
import "github.com/containrrr/shoutrrr"

func main() {
    urls := []string{
        "slack://token@channel",
        "discord://token@webhook",
    }
    sender, err := shoutrrr.CreateSender(urls...)
    sender.Send("Deployment complete", nil)
}
```

### Custom Webhook Integration

```bash
shoutrrr send \
  "generic+https://api.example.com/notify?template=json&titleKey=subject" \
  "Server alert"
```

---

## 11. Notable Characteristics

### Strengths

- **Unified Interface:** Single URL format across 20+ services
- **Zero Dependencies:** Clean implementation, minimal external dependencies
- **Timeout Protection:** Built-in 10-second timeouts prevent hanging
- **Batch Operations:** Native queue-based multi-destination delivery
- **Generic Fallback:** Custom webhooks for unsupported services
- **Go Native:** Direct integration with Go applications
- **Active Maintenance:** 390+ commits, 28 contributors, 1.5k stars
- **MIT Licensed:** Permissive open-source license

### Design Philosophy

- **Modularity:** Each service isolated in own package
- **Interface-Based:** Clean Service/Sender/Templater contracts
- **Composition Over Inheritance:** Sender combines multiple services
- **URL-Based Configuration:** No YAML/JSON configs needed
- **Simplicity:** Easy to understand and extend

### Ecosystem Adoption

- **Watchtower:** Docker automation notifications
- **Kured:** Kubernetes reboot daemon notifications
- **Argus:** Release monitoring notifications
- **Multiple Forks:** ServerLeader, HenryGD, DevOps-Golang variations

---

## 12. Missing Information / Unresolved Questions

1. **Retry Logic:** No information found on built-in retry mechanisms. Appears to be single-shot delivery. Callers implement retries at application level.

2. **Rate Limiting:** No explicit rate limiting documentation found. Depends on underlying service rate limits.

3. **Message Size Limits:** No explicit per-service message size documentation in research materials.

4. **Webhooks Signing/Verification:** No mention of request signing or callback verification.

5. **Async Error Handling:** `SendAsync()` error collection mechanism not documented in detail.

6. **Custom Service Registration:** How to dynamically register new service implementations at runtime (appears to be compile-time only).

7. **Performance Benchmarks:** No benchmark data on throughput or latency per service.

8. **TLS/Certificate Verification:** No explicit documentation on certificate handling for self-hosted services.

---

## Summary

Shoutrrr is a well-architected, production-ready notification library for Go with:
- **20+ integrated notification services** accessed via URL schemes
- **Modular architecture** with clean separation: router, services, types, format, generators, util
- **Simple API surface** (Send, CreateSender, NewSender, SetLogger, Version)
- **Rich configuration** via URL parameters with template support
- **Robust error handling** with timeouts and graceful degradation in batch operations
- **Extensibility** via Generic service for custom webhooks
- **Active ecosystem** with integration in Watchtower, Kured, and other tools

---

## References

- [GitHub Repository](https://github.com/containrrr/shoutrrr)
- [Official Documentation](https://containrrr.dev/shoutrrr/)
- [Go Package Documentation](https://pkg.go.dev/github.com/containrrr/shoutrrr)
- [Service Overview](https://github.com/containrrr/shoutrrr/blob/main/docs/services/overview.md)
- [Getting Started Guide](https://containrrr.dev/shoutrrr/v0.4/getting-started/)
- [Slack Service Docs](https://containrrr.dev/shoutrrr/v0.8/services/slack/)
- [Discord Service Docs](https://containrrr.dev/shoutrrr/v0.8/services/discord/)
- [Telegram Service Docs](https://containrrr.dev/shoutrrr/v0.8/services/telegram/)
- [Generic Service Docs](https://github.com/containrrr/shoutrrr/blob/main/docs/services/generic.md)
- [Types Package](https://pkg.go.dev/github.com/serverleader/shoutrrr/pkg/types)
- [Router Package](https://pkg.go.dev/github.com/serverleader/shoutrrr/pkg/router)
