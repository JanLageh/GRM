using Microsoft.EntityFrameworkCore;
using GRM_Backend.Models;

namespace GRM_Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> Variants => Set<ProductVariant>();
    public DbSet<Bundle> Bundles => Set<Bundle>();
    public DbSet<BundleItem> BundleItems => Set<BundleItem>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Quotation> Quotations => Set<Quotation>();
    public DbSet<QuotationItem> QuotationItems => Set<QuotationItem>();
    public DbSet<SalesOrder> SalesOrders => Set<SalesOrder>();
    public DbSet<SalesOrderItem> SalesOrderItems => Set<SalesOrderItem>();
    public DbSet<OrderCorrection> OrderCorrections => Set<OrderCorrection>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.Username).IsUnique();
        });

        modelBuilder.Entity<Product>()
            .HasMany(p => p.Variants).WithOne(v => v.Product).HasForeignKey(v => v.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ProductVariant>().HasIndex(v => v.Sku).IsUnique();
        modelBuilder.Entity<ProductVariant>().Property(v => v.Price).HasPrecision(18, 2);
        modelBuilder.Entity<StockMovement>()
            .HasOne(m => m.Variant).WithMany().HasForeignKey(m => m.VariantId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CartItem>()
            .HasOne(c => c.Variant).WithMany().HasForeignKey(c => c.VariantId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CartItem>().HasIndex(c => new { c.UserId, c.VariantId }).IsUnique();
        modelBuilder.Entity<Bundle>().Property(b => b.Price).HasPrecision(18, 2);
        modelBuilder.Entity<Bundle>()
            .HasMany(b => b.Items).WithOne().HasForeignKey(i => i.BundleId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<BundleItem>()
            .HasOne(i => i.Variant).WithMany().HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        // Quotation
        modelBuilder.Entity<Quotation>()
            .HasOne(q => q.Customer).WithMany().HasForeignKey(q => q.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Quotation>()
            .HasOne(q => q.Staff).WithMany().HasForeignKey(q => q.StaffId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Quotation>()
            .Property(q => q.DiscountPercent).HasPrecision(5, 2);
        modelBuilder.Entity<Quotation>()
            .HasMany(q => q.Items).WithOne(i => i.Quotation).HasForeignKey(i => i.QuotationId)
            .OnDelete(DeleteBehavior.Cascade);

        // QuotationItem
        modelBuilder.Entity<QuotationItem>()
            .HasOne(i => i.Variant).WithMany().HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<QuotationItem>()
            .Property(i => i.UnitPrice).HasPrecision(18, 2);

        // SalesOrder
        modelBuilder.Entity<SalesOrder>()
            .HasOne(o => o.Quotation).WithMany().HasForeignKey(o => o.QuotationId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SalesOrder>()
            .HasOne(o => o.Customer).WithMany().HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SalesOrder>()
            .HasOne(o => o.Staff).WithMany().HasForeignKey(o => o.StaffId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<SalesOrder>()
            .HasOne(o => o.CorrectedBy).WithMany().HasForeignKey(o => o.CorrectedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<SalesOrder>()
            .Property(o => o.DiscountPercent).HasPrecision(5, 2);
        modelBuilder.Entity<SalesOrder>()
            .Property(o => o.Subtotal).HasPrecision(18, 2);
        modelBuilder.Entity<SalesOrder>()
            .Property(o => o.DiscountAmount).HasPrecision(18, 2);
        modelBuilder.Entity<SalesOrder>()
            .Property(o => o.Total).HasPrecision(18, 2);
        modelBuilder.Entity<SalesOrder>()
            .HasIndex(o => o.QuotationId).IsUnique(); // one order per quote
        modelBuilder.Entity<SalesOrder>()
            .HasIndex(o => o.Status);
        modelBuilder.Entity<SalesOrder>()
            .HasIndex(o => o.Channel);
        modelBuilder.Entity<SalesOrder>()
            .HasMany(o => o.Items).WithOne(i => i.SalesOrder).HasForeignKey(i => i.SalesOrderId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<SalesOrder>()
            .HasMany(o => o.Corrections).WithOne(c => c.SalesOrder).HasForeignKey(c => c.SalesOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // SalesOrderItem
        modelBuilder.Entity<SalesOrderItem>()
            .HasOne(i => i.Variant).WithMany().HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SalesOrderItem>()
            .Property(i => i.UnitPrice).HasPrecision(18, 2);

        // OrderCorrection
        modelBuilder.Entity<OrderCorrection>()
            .HasOne(c => c.CorrectedBy).WithMany().HasForeignKey(c => c.CorrectedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<OrderCorrection>()
            .Property(c => c.PreviousTotal).HasPrecision(18, 2);
        modelBuilder.Entity<OrderCorrection>()
            .Property(c => c.NewTotal).HasPrecision(18, 2);

        // Invoice
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Order).WithMany().HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Customer).WithMany().HasForeignKey(i => i.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.IssuedBy).WithMany().HasForeignKey(i => i.IssuedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.VoidedBy).WithMany().HasForeignKey(i => i.VoidedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Invoice>()
            .Property(i => i.DiscountPercent).HasPrecision(5, 2);
        modelBuilder.Entity<Invoice>()
            .Property(i => i.Subtotal).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>()
            .Property(i => i.DiscountAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>()
            .Property(i => i.TotalAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>()
            .Property(i => i.AmountPaid).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.InvoiceNumber).IsUnique();
        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.OrderId); // non-unique: allows reissue after void
        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.CustomerId);
        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.PaymentStatus);
        modelBuilder.Entity<Invoice>()
            .HasMany(i => i.Items).WithOne(it => it.Invoice).HasForeignKey(it => it.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // InvoiceItem
        modelBuilder.Entity<InvoiceItem>()
            .HasOne(it => it.Variant).WithMany().HasForeignKey(it => it.VariantId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InvoiceItem>()
            .Property(it => it.UnitPrice).HasPrecision(18, 2);
    }
}
