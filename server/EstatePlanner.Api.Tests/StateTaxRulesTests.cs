using EstatePlanner.Api.Services;

namespace EstatePlanner.Api.Tests;

public class StateTaxRulesTests
{
    [Fact]
    public void Oregon_estate_over_the_exemption_is_flagged()
    {
        var notes = StateTaxRules.BuildNotes("OR", 1_200_000m);
        var note = Assert.Single(notes);
        Assert.Contains("state estate tax", note);
        Assert.Contains("$1,000,000", note);
        Assert.Contains("above it", note);
    }

    [Fact]
    public void Approaching_the_threshold_warns_without_alarming()
    {
        var notes = StateTaxRules.BuildNotes("MA", 1_700_000m); // 85% of $2M
        var note = Assert.Single(notes);
        Assert.Contains("within 20%", note);
    }

    [Fact]
    public void No_tax_state_produces_no_notes()
    {
        Assert.Empty(StateTaxRules.BuildNotes("TX", 5_000_000m));
        Assert.Empty(StateTaxRules.BuildNotes("CA", 10_000_000m));
    }

    [Fact]
    public void Inheritance_states_note_the_heir_side_tax_regardless_of_size()
    {
        var notes = StateTaxRules.BuildNotes("PA", 100_000m);
        var note = Assert.Single(notes);
        Assert.Contains("inheritance tax", note);
        Assert.Contains("heirs", note);
    }

    [Fact]
    public void Maryland_gets_both_estate_and_inheritance_notes_when_large()
    {
        var notes = StateTaxRules.BuildNotes("MD", 6_000_000m);
        Assert.Equal(2, notes.Count);
        Assert.Contains(notes, n => n.Contains("state estate tax"));
        Assert.Contains(notes, n => n.Contains("inheritance tax"));
    }

    [Fact]
    public void New_york_cliff_is_called_out()
    {
        var notes = StateTaxRules.BuildNotes("NY", 8_000_000m);
        Assert.Contains(notes, n => n.Contains("cliff"));
    }

    [Fact]
    public void Federal_exemption_note_appears_only_above_15_million()
    {
        Assert.DoesNotContain(StateTaxRules.BuildNotes("TX", 14_000_000m), n => n.Contains("federal"));
        var notes = StateTaxRules.BuildNotes("TX", 16_000_000m);
        var note = Assert.Single(notes);
        Assert.Contains("federal estate tax exemption", note);
    }

    [Fact]
    public void Small_estates_in_estate_tax_states_stay_quiet()
    {
        Assert.Empty(StateTaxRules.BuildNotes("OR", 500_000m));
        Assert.Empty(StateTaxRules.BuildNotes("NY", 2_000_000m));
    }
}
