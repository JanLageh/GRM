using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GRM_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddScopeAlignmentFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Variants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BundleId",
                table: "SalesOrderItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BundleName",
                table: "SalesOrderItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "Quotations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BundleId",
                table: "QuotationItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BundleName",
                table: "QuotationItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFeatured",
                table: "Products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "BundleName",
                table: "InvoiceItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Bundles",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BusinessSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaxStaffDiscountPercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    DefaultQuotationValidityDays = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedByUserId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessSettings_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "CartBundleItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    BundleId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CartBundleItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CartBundleItems_Bundles_BundleId",
                        column: x => x.BundleId,
                        principalTable: "Bundles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderItems_BundleId",
                table: "SalesOrderItems",
                column: "BundleId");

            migrationBuilder.CreateIndex(
                name: "IX_QuotationItems_BundleId",
                table: "QuotationItems",
                column: "BundleId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessSettings_UpdatedByUserId",
                table: "BusinessSettings",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CartBundleItems_BundleId",
                table: "CartBundleItems",
                column: "BundleId");

            migrationBuilder.CreateIndex(
                name: "IX_CartBundleItems_UserId_BundleId",
                table: "CartBundleItems",
                columns: new[] { "UserId", "BundleId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_QuotationItems_Bundles_BundleId",
                table: "QuotationItems",
                column: "BundleId",
                principalTable: "Bundles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SalesOrderItems_Bundles_BundleId",
                table: "SalesOrderItems",
                column: "BundleId",
                principalTable: "Bundles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_QuotationItems_Bundles_BundleId",
                table: "QuotationItems");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesOrderItems_Bundles_BundleId",
                table: "SalesOrderItems");

            migrationBuilder.DropTable(
                name: "BusinessSettings");

            migrationBuilder.DropTable(
                name: "CartBundleItems");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrderItems_BundleId",
                table: "SalesOrderItems");

            migrationBuilder.DropIndex(
                name: "IX_QuotationItems_BundleId",
                table: "QuotationItems");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Variants");

            migrationBuilder.DropColumn(
                name: "BundleId",
                table: "SalesOrderItems");

            migrationBuilder.DropColumn(
                name: "BundleName",
                table: "SalesOrderItems");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "Quotations");

            migrationBuilder.DropColumn(
                name: "BundleId",
                table: "QuotationItems");

            migrationBuilder.DropColumn(
                name: "BundleName",
                table: "QuotationItems");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "IsFeatured",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "BundleName",
                table: "InvoiceItems");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Bundles");
        }
    }
}
