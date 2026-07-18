using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstatePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class ExecutedStateCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExecutedStateCode",
                table: "WillPlans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExecutedStateCode",
                table: "TrustPlans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExecutedStateCode",
                table: "EstateDocuments",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExecutedStateCode",
                table: "WillPlans");

            migrationBuilder.DropColumn(
                name: "ExecutedStateCode",
                table: "TrustPlans");

            migrationBuilder.DropColumn(
                name: "ExecutedStateCode",
                table: "EstateDocuments");
        }
    }
}
