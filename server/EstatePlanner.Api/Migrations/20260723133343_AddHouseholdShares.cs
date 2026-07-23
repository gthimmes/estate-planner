using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstatePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseholdShares : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HouseholdShares",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InviteToken = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SharedWithUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SharedWithEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RedeemedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HouseholdShares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HouseholdShares_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HouseholdShares_HouseholdId_SharedWithUserId",
                table: "HouseholdShares",
                columns: new[] { "HouseholdId", "SharedWithUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_HouseholdShares_InviteToken",
                table: "HouseholdShares",
                column: "InviteToken",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HouseholdShares");
        }
    }
}
