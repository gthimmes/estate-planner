using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstatePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWillPlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WillPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    TestatorPersonId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExecutorPersonId = table.Column<Guid>(type: "uuid", nullable: true),
                    BackupExecutorPersonId = table.Column<Guid>(type: "uuid", nullable: true),
                    WaiveExecutorBond = table.Column<bool>(type: "boolean", nullable: false),
                    GuardianPersonId = table.Column<Guid>(type: "uuid", nullable: true),
                    BackupGuardianPersonId = table.Column<Guid>(type: "uuid", nullable: true),
                    ResiduaryStrategy = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Gifts = table.Column<string>(type: "jsonb", nullable: true),
                    ResiduaryShares = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WillPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WillPlans_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WillPlans_HouseholdId",
                table: "WillPlans",
                column: "HouseholdId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WillPlans");
        }
    }
}
