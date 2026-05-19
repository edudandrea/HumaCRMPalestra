using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace Edu.Controllers;

[ApiController]
[Route("api/pagamentos")]
public sealed class PagamentosController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly IReadOnlyDictionary<string, LoteConfig> Lotes = new Dictionary<string, LoteConfig>
    {
        ["lote-1"] = new("Lote 1 - Promocional", 67.90m),
        ["lote-2"] = new("Lote 2", 97.90m),
        ["lote-final"] = new("Lote Final", 127.90m)
    };

    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PagamentosController> _logger;

    public PagamentosController(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<PagamentosController> logger)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet("config")]
    public IActionResult ObterConfigPublica()
    {
        return Ok(new
        {
            publicKey = ObterPublicKey(),
            possuiAccessToken = !string.IsNullOrWhiteSpace(ObterAccessToken())
        });
    }

    [HttpGet("metodos")]
    public async Task<IActionResult> ObterMetodosPagamento(CancellationToken cancellationToken)
    {
        var accessToken = ObterAccessToken();
        if (string.IsNullOrWhiteSpace(accessToken))
            return StatusCode(500, new { erro = "Token do Mercado Pago nao configurado no servidor." });

        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, "v1/payment_methods");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await EnviarMercadoPagoAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
            return await MercadoPagoErroAsync(response, "Erro ao consultar formas de pagamento.", cancellationToken);

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        var metodos = document.RootElement
            .EnumerateArray()
            .Where(metodo =>
            {
                var id = ObterString(metodo, "id");
                var tipo = ObterString(metodo, "payment_type_id");

                return string.Equals(id, "pix", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(tipo, "credit_card", StringComparison.OrdinalIgnoreCase);
            })
            .Select(metodo => new
            {
                id = ObterString(metodo, "id"),
                nome = ObterString(metodo, "name"),
                tipo = ObterString(metodo, "payment_type_id"),
                status = ObterString(metodo, "status"),
                thumbnail = ObterString(metodo, "thumbnail"),
                secureThumbnail = ObterString(metodo, "secure_thumbnail")
            })
            .ToArray();

        return Ok(new { metodos });
    }

    [HttpGet("status/{paymentId:long}")]
    public async Task<IActionResult> ObterStatusPagamento(long paymentId, CancellationToken cancellationToken)
    {
        var accessToken = ObterAccessToken();
        if (string.IsNullOrWhiteSpace(accessToken))
            return StatusCode(500, new { erro = "Token do Mercado Pago nao configurado no servidor." });

        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, $"v1/payments/{paymentId}");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await EnviarMercadoPagoAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
            return await MercadoPagoErroAsync(response, "Erro ao consultar status do pagamento.", cancellationToken);

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = document.RootElement;

        return Ok(new
        {
            id = paymentId,
            status = ObterString(root, "status"),
            statusDetail = ObterString(root, "status_detail")
        });
    }

    [HttpPost("pix")]
    public async Task<IActionResult> CriarPix([FromBody] CriarPagamentoRequest request, CancellationToken cancellationToken)
    {
        var validation = ValidarRequest(request);
        if (validation is not null)
            return validation;

        var lote = ObterLote(request.Lote);
        if (lote is null)
            return BadRequest(new { erro = "Lote invalido." });

        var accessToken = ObterAccessToken();
        if (string.IsNullOrWhiteSpace(accessToken))
            return StatusCode(500, new { erro = "Token do Mercado Pago nao configurado no servidor." });

        var payload = new
        {
            transaction_amount = lote.Value.Valor,
            description = $"Treinamento GEN Z & ALPHA - {lote.Value.Nome}",
            payment_method_id = "pix",
            payer = new
            {
                email = request.Email,
                first_name = PrimeiroNome(request.Nome),
                last_name = Sobrenome(request.Nome),
                identification = new
                {
                    type = "CPF",
                    number = SomenteDigitos(request.Cpf)
                }
            },
            metadata = new
            {
                lote = lote.Value.Nome,
                telefone = request.Telefone,
                origem = "site"
            },
            statement_descriptor = ObterConfiguracao("StatementDescriptor")
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "v1/payments")
        {
            Content = JsonContent.Create(payload, options: JsonOptions)
        };
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        httpRequest.Headers.Add("X-Idempotency-Key", Guid.NewGuid().ToString("N"));

        var response = await EnviarMercadoPagoAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
            return await MercadoPagoErroAsync(response, "Erro ao gerar pagamento Pix.", cancellationToken);

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = document.RootElement;
        var transactionData = root.GetProperty("point_of_interaction").GetProperty("transaction_data");

        return Ok(new
        {
            id = root.GetProperty("id").GetInt64(),
            status = root.GetProperty("status").GetString(),
            valor = lote.Value.Valor,
            qrCode = transactionData.GetProperty("qr_code").GetString(),
            qrCodeBase64 = transactionData.GetProperty("qr_code_base64").GetString()
        });
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> CriarCheckout([FromBody] CriarPagamentoRequest request, CancellationToken cancellationToken)
    {
        var validation = ValidarRequest(request);
        if (validation is not null)
            return validation;

        var lote = ObterLote(request.Lote);
        if (lote is null)
            return BadRequest(new { erro = "Lote invalido." });

        var accessToken = ObterAccessToken();
        if (string.IsNullOrWhiteSpace(accessToken))
            return StatusCode(500, new { erro = "Token do Mercado Pago nao configurado no servidor." });

        var backUrls = CriarBackUrls();
        var payload = new
        {
            items = new[]
            {
                new
                {
                    id = request.Lote,
                    title = lote.Value.Nome,
                    description = "Treinamento GEN Z & ALPHA",
                    quantity = 1,
                    currency_id = "BRL",
                    unit_price = lote.Value.Valor
                }
            },
            payer = new
            {
                name = PrimeiroNome(request.Nome),
                surname = Sobrenome(request.Nome),
                email = request.Email,
                identification = new
                {
                    type = "CPF",
                    number = SomenteDigitos(request.Cpf)
                },
                phone = new
                {
                    number = SomenteDigitos(request.Telefone)
                }
            },
            back_urls = backUrls,
            auto_return = backUrls is null ? null : "approved",
            notification_url = ObterConfiguracao("NotificationUrl"),
            external_reference = $"site-{request.Lote}-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}",
            statement_descriptor = ObterConfiguracao("StatementDescriptor"),
            metadata = new
            {
                lote = lote.Value.Nome,
                telefone = request.Telefone,
                origem = "site"
            }
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "checkout/preferences")
        {
            Content = JsonContent.Create(payload, options: JsonOptions)
        };
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await EnviarMercadoPagoAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
            return await MercadoPagoErroAsync(response, "Erro ao criar checkout.", cancellationToken);

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = document.RootElement;

        return Ok(new
        {
            id = root.GetProperty("id").GetString(),
            initPoint = root.GetProperty("init_point").GetString(),
            sandboxInitPoint = root.TryGetProperty("sandbox_init_point", out var sandbox)
                ? sandbox.GetString()
                : null
        });
    }

    private async Task<HttpResponseMessage> EnviarMercadoPagoAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("MercadoPago");
        return await client.SendAsync(request, cancellationToken);
    }

    private ObjectResult? ValidarRequest(CriarPagamentoRequest? request)
    {
        if (request is null)
            return BadRequest(new { erro = "Dados do comprador nao enviados." });

        if (string.IsNullOrWhiteSpace(request.Nome))
            return BadRequest(new { erro = "Informe o nome completo." });

        if (string.IsNullOrWhiteSpace(request.Email) || !new EmailAddressAttribute().IsValid(request.Email))
            return BadRequest(new { erro = "Informe um e-mail valido." });

        if (SomenteDigitos(request.Cpf).Length != 11)
            return BadRequest(new { erro = "CPF invalido." });

        if (SomenteDigitos(request.Telefone).Length < 10)
            return BadRequest(new { erro = "Telefone invalido." });

        return null;
    }

    private string ObterAccessToken()
    {
        return Environment.GetEnvironmentVariable("MERCADOPAGO_ACCESS_TOKEN")
            ?? _configuration["MercadoPago:AccessToken"]
            ?? string.Empty;
    }

    private string ObterPublicKey()
    {
        return Environment.GetEnvironmentVariable("MERCADOPAGO_PUBLIC_KEY")
            ?? _configuration["MercadoPago:PublicKey"]
            ?? string.Empty;
    }

    private string? ObterConfiguracao(string key)
    {
        var value = Environment.GetEnvironmentVariable($"MERCADOPAGO_{key.ToUpperInvariant()}")
            ?? _configuration[$"MercadoPago:{key}"];

        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private object? CriarBackUrls()
    {
        var success = ObterConfiguracao("SuccessUrl") ?? CriarUrlRetorno("aprovado");
        var failure = ObterConfiguracao("FailureUrl") ?? CriarUrlRetorno("falha");
        var pending = ObterConfiguracao("PendingUrl") ?? CriarUrlRetorno("pendente");

        return new
        {
            success,
            failure,
            pending
        };
    }

    private string CriarUrlRetorno(string status)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
        return $"{baseUrl}/?pagamento={status}";
    }

    private async Task<IActionResult> MercadoPagoErroAsync(HttpResponseMessage response, string fallbackMessage, CancellationToken cancellationToken)
    {
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogWarning("Mercado Pago retornou {StatusCode}: {Body}", response.StatusCode, body);

        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            return StatusCode(500, new { erro = "Credenciais do Mercado Pago invalidas ou sem permissao." });

        return StatusCode(502, new { erro = fallbackMessage });
    }

    private static LoteConfig? ObterLote(string lote)
    {
        var key = NormalizarLote(lote);
        return Lotes.TryGetValue(key, out var config) ? config : null;
    }

    private static string NormalizarLote(string lote)
    {
        var texto = (lote ?? string.Empty).ToLowerInvariant();

        if (texto.Contains("final", StringComparison.OrdinalIgnoreCase))
            return "lote-final";

        if (texto.Contains("2", StringComparison.OrdinalIgnoreCase))
            return "lote-2";

        return "lote-1";
    }

    private static string SomenteDigitos(string? value)
    {
        return new string((value ?? string.Empty).Where(char.IsDigit).ToArray());
    }

    private static string PrimeiroNome(string nome)
    {
        return nome.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? nome.Trim();
    }

    private static string Sobrenome(string nome)
    {
        var partes = nome.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return partes.Length <= 1 ? string.Empty : string.Join(' ', partes.Skip(1));
    }

    private static string? ObterString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var value) && value.ValueKind is not JsonValueKind.Null
            ? value.GetString()
            : null;
    }

    private readonly record struct LoteConfig(string Nome, decimal Valor);
}

public sealed class CriarPagamentoRequest
{
    [Required]
    public string Lote { get; set; } = string.Empty;

    [Required]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Cpf { get; set; } = string.Empty;

    [Required]
    public string Telefone { get; set; } = string.Empty;
}
