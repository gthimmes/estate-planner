using EstatePlanner.Api.Contracts;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EstatePlanner.Api.Services;

/// <summary>Renders an assembled legal document as a clean, letter-sized PDF.</summary>
public class PdfService
{
    static PdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] Render(WillDocumentResponse document)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(60);
                page.DefaultTextStyle(t => t.FontFamily("Georgia").FontSize(11).LineHeight(1.5f));

                if (document.IsDraft)
                {
                    page.Background().AlignCenter().AlignMiddle().Rotate(-30)
                        .Text("DRAFT").FontSize(110).FontColor(Colors.Red.Lighten4).Bold();
                }

                page.Header().PaddingBottom(18).Column(header =>
                {
                    header.Item().AlignCenter().Text(document.Title.ToUpperInvariant())
                        .FontSize(16).Bold().LetterSpacing(0.06f);
                });

                page.Content().Column(content =>
                {
                    foreach (var article in document.Articles)
                    {
                        content.Item().PaddingTop(14).Text(article.Heading.ToUpperInvariant())
                            .FontSize(11).Bold().LetterSpacing(0.05f);
                        foreach (var paragraph in article.Paragraphs)
                        {
                            content.Item().PaddingTop(6).Text(paragraph).Justify();
                        }
                    }
                });

                page.Footer().Column(footer =>
                {
                    footer.Item().PaddingTop(8).BorderTop(0.5f).PaddingTop(6)
                        .Text(document.Disclosure).FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                    footer.Item().AlignCenter().PaddingTop(4).Text(t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(8).FontColor(Colors.Grey.Darken1));
                        t.Span("Page ");
                        t.CurrentPageNumber();
                        t.Span(" of ");
                        t.TotalPages();
                    });
                });
            });
        }).GeneratePdf();
    }
}
