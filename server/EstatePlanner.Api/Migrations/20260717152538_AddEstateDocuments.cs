using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstatePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEstateDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EstateDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PrincipalPersonId = table.Column<Guid>(type: "uuid", nullable: true),
                    AgentPersonId = table.Column<Guid>(type: "uuid", nullable: true),
                    BackupAgentPersonId = table.Column<Guid>(type: "uuid", nullable: true),
                    EffectiveImmediately = table.Column<bool>(type: "boolean", nullable: false),
                    LifeSupport = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IncludeHipaa = table.Column<bool>(type: "boolean", nullable: false),
                    OrganDonation = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ExecutedOn = table.Column<DateOnly>(type: "date", nullable: true),
                    ExecutionNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstateDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EstateDocuments_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EstateDocuments_HouseholdId_Type",
                table: "EstateDocuments",
                columns: new[] { "HouseholdId", "Type" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EstateDocuments");
        }
    }
}
