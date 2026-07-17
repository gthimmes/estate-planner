using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstatePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWillExecution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "ExecutedOn",
                table: "WillPlans",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StorageLocation",
                table: "WillPlans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Witness1Name",
                table: "WillPlans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Witness2Name",
                table: "WillPlans",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExecutedOn",
                table: "WillPlans");

            migrationBuilder.DropColumn(
                name: "StorageLocation",
                table: "WillPlans");

            migrationBuilder.DropColumn(
                name: "Witness1Name",
                table: "WillPlans");

            migrationBuilder.DropColumn(
                name: "Witness2Name",
                table: "WillPlans");
        }
    }
}
