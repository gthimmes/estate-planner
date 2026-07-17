using EstatePlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Household> Households => Set<Household>();
    public DbSet<Person> People => Set<Person>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<WillPlan> WillPlans => Set<WillPlan>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Household>(e =>
        {
            e.Property(h => h.Name).HasMaxLength(200);
            e.Property(h => h.StateCode).HasMaxLength(2);
            e.Property(h => h.MaritalStatus).HasConversion<string>().HasMaxLength(30);
            e.HasMany(h => h.People).WithOne(p => p.Household).HasForeignKey(p => p.HouseholdId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(h => h.Assets).WithOne(a => a.Household).HasForeignKey(a => a.HouseholdId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Person>(e =>
        {
            e.Property(p => p.FirstName).HasMaxLength(100);
            e.Property(p => p.LastName).HasMaxLength(100);
            e.Property(p => p.Role).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<WillPlan>(e =>
        {
            e.HasOne(w => w.Household).WithOne(h => h.WillPlan).HasForeignKey<WillPlan>(w => w.HouseholdId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(w => w.HouseholdId).IsUnique();
            e.Property(w => w.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(w => w.ResiduaryStrategy).HasConversion<string>().HasMaxLength(30);
            e.OwnsMany(w => w.Gifts, b => b.ToJson());
            e.OwnsMany(w => w.ResiduaryShares, b => b.ToJson());
        });

        modelBuilder.Entity<Asset>(e =>
        {
            e.Property(a => a.Name).HasMaxLength(200);
            e.Property(a => a.Category).HasConversion<string>().HasMaxLength(30);
            e.Property(a => a.BeneficiaryStatus).HasConversion<string>().HasMaxLength(20);
            e.Property(a => a.BeneficiaryName).HasMaxLength(200);
            e.Property(a => a.Notes).HasMaxLength(2000);
            e.Property(a => a.EstimatedValue).HasPrecision(18, 2);
        });
    }
}
