using System.Text;
using GRM_Backend.Data;
using GRM_Backend.Models;
using GRM_Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add Database Context (In-Memory Database for reliable operation and testing)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("GRM_Backend_Db"));

// Add Services
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<ITokenBlacklistService, TokenBlacklistService>();

// Add JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "SuperSecretKeyForJwtTokenGenerationAndValidationInDevelopmentAndProduction123456!";
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "GRM_Backend";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "GRM_Backend";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        // Accept both "Bearer <token>" and a raw "<token>" in the Authorization header
        OnMessageReceived = context =>
        {
            var authHeader = context.Request.Headers.Authorization.ToString().Trim();
            if (!string.IsNullOrEmpty(authHeader))
            {
                context.Token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                    ? authHeader.Substring("Bearer ".Length).Trim().Trim('"')
                    : authHeader.Trim('"');
            }
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            var blacklistService = context.HttpContext.RequestServices.GetRequiredService<ITokenBlacklistService>();
            var token = (context.SecurityToken as Microsoft.IdentityModel.JsonWebTokens.JsonWebToken)?.EncodedToken
                        ?? (context.SecurityToken as System.IdentityModel.Tokens.Jwt.JwtSecurityToken)?.RawData;
            if (token != null && blacklistService.IsTokenBlacklisted(token))
            {
                context.Fail("This token has been revoked.");
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// CORS: allow the Expo web frontend (Metro dev server) to call this API from the browser
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy => policy
        .SetIsOriginAllowed(origin => new Uri(origin).IsLoopback) // http://localhost:* / 127.0.0.1:*
        .AllowAnyHeader()
        .AllowAnyMethod());
});
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configure Swagger/OpenAPI with JWT Bearer support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "GRM Backend API",
        Version = "v1",
        Description = "API for Authentication and User Profile Management"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Enter: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Seed a default admin account (change the password in production)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
    if (!db.Users.Any(u => u.Role == "Admin"))
    {
        var admin = new User { Username = "admin", Email = "admin@grm.local", Role = "Admin", FullName = "Administrator" };
        admin.PasswordHash = hasher.HashPassword(admin, builder.Configuration["AdminSeed:Password"] ?? "Admin123!");
        db.Users.Add(admin);
        db.SaveChanges();
    }
    if (!db.Users.Any(u => u.Role == "Staff"))
    {
        var staff = new User { Username = "staff", Email = "staff@grm.local", Role = "Staff", FullName = "Staff Member" };
        staff.PasswordHash = hasher.HashPassword(staff, builder.Configuration["StaffSeed:Password"] ?? "Staff123!");
        db.Users.Add(staff);
        db.SaveChanges();
    }
}

// Seed demo customer + catalog (the database is in-memory, so this runs on every start)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
    if (!db.Users.Any(u => u.Role == "Customer"))
    {
        var cust = new User { Username = "customer", Email = "customer@grm.local", Role = "Customer", FullName = "Maria Santos", PhoneNumber = "0917 100 0003", Address = "Pajo, Lapu-Lapu City" };
        cust.PasswordHash = hasher.HashPassword(cust, "Customer123!");
        db.Users.Add(cust);
        db.SaveChanges();
    }
    if (!db.Products.Any())
    {
        ProductVariant V(string model, string sku, decimal price, int stock, int reorder) =>
            new() { Model = model, Sku = sku, Price = price, Stock = stock, ReorderThreshold = reorder };
        db.Products.AddRange(
            new Product { Name = "Garry SmartLock", Category = "Smart Locks", Description = "Keyless smart door lock.",
                Variants = { V("PIN Keypad", "SL-PIN-01", 5990, 24, 15), V("Biometric", "SL-BIO-01", 9490, 12, 8), V("Card + PIN", "SL-CRD-01", 7250, 9, 2) } },
            new Product { Name = "Monocrystalline Solar Panel Set", Category = "Solar Panels", Description = "High-efficiency mono PERC panel sets.",
                Variants = { V("Small (2 kW)", "SP-S-02", 18500, 15, 7), V("Medium (4 kW)", "SP-M-04", 34900, 10, 7), V("Large (7 kW)", "SP-L-07", 62000, 6, 5) } },
            new Product { Name = "LiFePO4 Solar Battery", Category = "Batteries", Description = "Wall-mount lithium iron phosphate battery.",
                Variants = { V("5 kWh", "BT-05", 48000, 8, 6), V("10 kWh", "BT-10", 89000, 5, 5) } });
        db.SaveChanges();

        int Id(string sku) => db.Variants.First(v => v.Sku == sku).Id;
        db.Bundles.AddRange(
            new Bundle { Name = "Small Solar + Battery Kit", Description = "2 kW panel set with a 5 kWh battery.", Price = 62000,
                Items = { new BundleItem { VariantId = Id("SP-S-02"), Quantity = 1 }, new BundleItem { VariantId = Id("BT-05"), Quantity = 1 } } },
            new Bundle { Name = "Medium Solar + Battery Kit", Description = "4 kW panel set with a 10 kWh battery.", Price = 119000,
                Items = { new BundleItem { VariantId = Id("SP-M-04"), Quantity = 1 }, new BundleItem { VariantId = Id("BT-10"), Quantity = 1 } } },
            new Bundle { Name = "Large Solar + Battery Kit", Description = "7 kW panel set with two 10 kWh batteries.", Price = 225000,
                Items = { new BundleItem { VariantId = Id("SP-L-07"), Quantity = 1 }, new BundleItem { VariantId = Id("BT-10"), Quantity = 2 } } });
        db.SaveChanges();
    }
}

// Configure HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseSwagger(c => c.SerializeAsV2 = true);
// Alias so tools expecting /openapi/v1.json also get a valid OpenAPI document
app.UseSwagger(c =>
{
    c.RouteTemplate = "openapi/{documentName}.json";
    c.SerializeAsV2 = true;
});
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "GRM Backend API v1");
    c.RoutePrefix = string.Empty; // Serve Swagger at root for convenience
});

app.UseHttpsRedirection();

app.UseCors("Frontend"); // must run before authentication so preflight (OPTIONS) requests succeed

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Expose Program for WebApplicationFactory tests
public partial class Program { }
