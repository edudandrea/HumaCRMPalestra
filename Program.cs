using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddHttpClient("MercadoPago", client =>
{
    client.BaseAddress = new Uri("https://api.mercadopago.com/");
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5000",
                "https://localhost:5001",
                "http://127.0.0.1:5000",
                "https://127.0.0.1:5001")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors("LocalFrontend");

var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".webmanifest"] = "application/manifest+json";
var staticFiles = new PhysicalFileProvider(app.Environment.ContentRootPath);

app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = staticFiles
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = staticFiles,
    ContentTypeProvider = provider
});

app.MapControllers();
app.MapFallback(async context =>
{
    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.SendFileAsync(Path.Combine(app.Environment.ContentRootPath, "index.html"));
});

app.Run();
