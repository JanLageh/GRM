using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GRM_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddOrdersManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "QuotationId",
                table: "SalesOrders",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "CustomerId",
                table: "SalesOrders",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "CancelReason",
                table: "SalesOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "SalesOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "SalesOrders",
                type: "text",
                nullable: false,
                defaultValue: "Online");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "SalesOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CorrectedAt",
                table: "SalesOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CorrectedByUserId",
                table: "SalesOrders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CorrectionReason",
                table: "SalesOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "SalesOrders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "SalesOrders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountPercent",
                table: "SalesOrders",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsCorrected",
                table: "SalesOrders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "SalesOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "SalesOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress",
                table: "SalesOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StaffId",
                table: "SalesOrders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "SalesOrders",
                type: "text",
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<decimal>(
                name: "Subtotal",
                table: "SalesOrders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "SalesOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OrderCorrections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SalesOrderId = table.Column<int>(type: "integer", nullable: false),
                    CorrectedByUserId = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    PreviousTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NewTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CorrectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderCorrections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderCorrections_SalesOrders_SalesOrderId",
                        column: x => x.SalesOrderId,
                        principalTable: "SalesOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderCorrections_Users_CorrectedByUserId",
                        column: x => x.CorrectedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesOrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SalesOrderId = table.Column<int>(type: "integer", nullable: false),
                    VariantId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesOrderItems_SalesOrders_SalesOrderId",
                        column: x => x.SalesOrderId,
                        principalTable: "SalesOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalesOrderItems_Variants_VariantId",
                        column: x => x.VariantId,
                        principalTable: "Variants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrders_Channel",
                table: "SalesOrders",
                column: "Channel");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrders_CorrectedByUserId",
                table: "SalesOrders",
                column: "CorrectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrders_StaffId",
                table: "SalesOrders",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrders_Status",
                table: "SalesOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_OrderCorrections_CorrectedByUserId",
                table: "OrderCorrections",
                column: "CorrectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderCorrections_SalesOrderId",
                table: "OrderCorrections",
                column: "SalesOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderItems_SalesOrderId",
                table: "SalesOrderItems",
                column: "SalesOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderItems_VariantId",
                table: "SalesOrderItems",
                column: "VariantId");

            migrationBuilder.AddForeignKey(
                name: "FK_SalesOrders_Users_CorrectedByUserId",
                table: "SalesOrders",
                column: "CorrectedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SalesOrders_Users_StaffId",
                table: "SalesOrders",
                column: "StaffId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SalesOrders_Users_CorrectedByUserId",
                table: "SalesOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesOrders_Users_StaffId",
                table: "SalesOrders");

            migrationBuilder.DropTable(
                name: "OrderCorrections");

            migrationBuilder.DropTable(
                name: "SalesOrderItems");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrders_Channel",
                table: "SalesOrders");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrders_CorrectedByUserId",
                table: "SalesOrders");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrders_StaffId",
                table: "SalesOrders");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrders_Status",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "CancelReason",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "Channel",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "CorrectedAt",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "CorrectedByUserId",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "CorrectionReason",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "CustomerName",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "DiscountPercent",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "IsCorrected",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "ShippingAddress",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "StaffId",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "Subtotal",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "SalesOrders");

            migrationBuilder.AlterColumn<int>(
                name: "QuotationId",
                table: "SalesOrders",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CustomerId",
                table: "SalesOrders",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
