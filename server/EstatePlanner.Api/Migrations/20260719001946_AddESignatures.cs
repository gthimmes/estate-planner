using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstatePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddESignatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SignatureHash",
                table: "WillPlans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatureImage",
                table: "WillPlans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SignedAtUtc",
                table: "WillPlans",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatureHash",
                table: "TrustPlans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatureImage",
                table: "TrustPlans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SignedAtUtc",
                table: "TrustPlans",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatureHash",
                table: "EstateDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatureImage",
                table: "EstateDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SignedAtUtc",
                table: "EstateDocuments",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SignatureHash",
                table: "WillPlans");

            migrationBuilder.DropColumn(
                name: "SignatureImage",
                table: "WillPlans");

            migrationBuilder.DropColumn(
                name: "SignedAtUtc",
                table: "WillPlans");

            migrationBuilder.DropColumn(
                name: "SignatureHash",
                table: "TrustPlans");

            migrationBuilder.DropColumn(
                name: "SignatureImage",
                table: "TrustPlans");

            migrationBuilder.DropColumn(
                name: "SignedAtUtc",
                table: "TrustPlans");

            migrationBuilder.DropColumn(
                name: "SignatureHash",
                table: "EstateDocuments");

            migrationBuilder.DropColumn(
                name: "SignatureImage",
                table: "EstateDocuments");

            migrationBuilder.DropColumn(
                name: "SignedAtUtc",
                table: "EstateDocuments");
        }
    }
}
