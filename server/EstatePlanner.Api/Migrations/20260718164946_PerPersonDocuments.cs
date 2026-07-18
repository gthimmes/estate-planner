using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstatePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class PerPersonDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WillPlans_HouseholdId",
                table: "WillPlans");

            migrationBuilder.DropIndex(
                name: "IX_TrustPlans_HouseholdId",
                table: "TrustPlans");

            migrationBuilder.DropIndex(
                name: "IX_EstateDocuments_HouseholdId_Type",
                table: "EstateDocuments");

            migrationBuilder.CreateIndex(
                name: "IX_WillPlans_HouseholdId_TestatorPersonId",
                table: "WillPlans",
                columns: new[] { "HouseholdId", "TestatorPersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrustPlans_HouseholdId_GrantorPersonId",
                table: "TrustPlans",
                columns: new[] { "HouseholdId", "GrantorPersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EstateDocuments_HouseholdId_Type_PrincipalPersonId",
                table: "EstateDocuments",
                columns: new[] { "HouseholdId", "Type", "PrincipalPersonId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WillPlans_HouseholdId_TestatorPersonId",
                table: "WillPlans");

            migrationBuilder.DropIndex(
                name: "IX_TrustPlans_HouseholdId_GrantorPersonId",
                table: "TrustPlans");

            migrationBuilder.DropIndex(
                name: "IX_EstateDocuments_HouseholdId_Type_PrincipalPersonId",
                table: "EstateDocuments");

            migrationBuilder.CreateIndex(
                name: "IX_WillPlans_HouseholdId",
                table: "WillPlans",
                column: "HouseholdId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrustPlans_HouseholdId",
                table: "TrustPlans",
                column: "HouseholdId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EstateDocuments_HouseholdId_Type",
                table: "EstateDocuments",
                columns: new[] { "HouseholdId", "Type" },
                unique: true);
        }
    }
}
