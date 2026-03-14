from dataclasses import dataclass

from .user_progress import LearnedPhonics


SELECTED_PHONICS_COUNT = 4


@dataclass(frozen=True)
class CatalogPhonics:
    ipa: str
    letter_combo: str


# A broad hardcoded English phonics inventory. Selection is driven by
# per-user exposure history, not by scene classification.
PHONICS_CATALOG = (
    CatalogPhonics(ipa="/ʃ/", letter_combo="sh"),
    CatalogPhonics(ipa="/tʃ/", letter_combo="ch"),
    CatalogPhonics(ipa="/θ/", letter_combo="th"),
    CatalogPhonics(ipa="/ð/", letter_combo="th"),
    CatalogPhonics(ipa="/ŋ/", letter_combo="ng"),
    CatalogPhonics(ipa="/f/", letter_combo="ph"),
    CatalogPhonics(ipa="/kw/", letter_combo="qu"),
    CatalogPhonics(ipa="/dʒ/", letter_combo="j"),
    CatalogPhonics(ipa="/ʒ/", letter_combo="si"),
    CatalogPhonics(ipa="/k/", letter_combo="ck"),
    CatalogPhonics(ipa="/b/", letter_combo="b"),
    CatalogPhonics(ipa="/d/", letter_combo="d"),
    CatalogPhonics(ipa="/f/", letter_combo="f"),
    CatalogPhonics(ipa="/g/", letter_combo="g"),
    CatalogPhonics(ipa="/h/", letter_combo="h"),
    CatalogPhonics(ipa="/j/", letter_combo="y"),
    CatalogPhonics(ipa="/k/", letter_combo="c"),
    CatalogPhonics(ipa="/l/", letter_combo="l"),
    CatalogPhonics(ipa="/m/", letter_combo="m"),
    CatalogPhonics(ipa="/n/", letter_combo="n"),
    CatalogPhonics(ipa="/p/", letter_combo="p"),
    CatalogPhonics(ipa="/r/", letter_combo="r"),
    CatalogPhonics(ipa="/s/", letter_combo="s"),
    CatalogPhonics(ipa="/t/", letter_combo="t"),
    CatalogPhonics(ipa="/v/", letter_combo="v"),
    CatalogPhonics(ipa="/w/", letter_combo="w"),
    CatalogPhonics(ipa="/z/", letter_combo="z"),
    CatalogPhonics(ipa="/æ/", letter_combo="a"),
    CatalogPhonics(ipa="/ɛ/", letter_combo="e"),
    CatalogPhonics(ipa="/ɪ/", letter_combo="i"),
    CatalogPhonics(ipa="/ɒ/", letter_combo="o"),
    CatalogPhonics(ipa="/ʌ/", letter_combo="u"),
    CatalogPhonics(ipa="/iː/", letter_combo="ee"),
    CatalogPhonics(ipa="/uː/", letter_combo="oo"),
    CatalogPhonics(ipa="/ɑː/", letter_combo="ar"),
    CatalogPhonics(ipa="/ɔː/", letter_combo="or"),
    CatalogPhonics(ipa="/ɜː/", letter_combo="ir"),
    CatalogPhonics(ipa="/eɪ/", letter_combo="a_e"),
    CatalogPhonics(ipa="/aɪ/", letter_combo="i_e"),
    CatalogPhonics(ipa="/oʊ/", letter_combo="o_e"),
    CatalogPhonics(ipa="/juː/", letter_combo="u_e"),
    CatalogPhonics(ipa="/ɔɪ/", letter_combo="oi"),
    CatalogPhonics(ipa="/aʊ/", letter_combo="ou"),
    CatalogPhonics(ipa="/ɪər/", letter_combo="ear"),
    CatalogPhonics(ipa="/eər/", letter_combo="air"),
    CatalogPhonics(ipa="/ʊər/", letter_combo="ure"),
)


def select_phonics(learned_phonics: list[LearnedPhonics]) -> list[CatalogPhonics]:
    learned_counts = {
        (item.ipa, item.letter_combo): item.count
        for item in learned_phonics
    }

    ranked_catalog = sorted(
        PHONICS_CATALOG,
        key=lambda item: (
            learned_counts.get((item.ipa, item.letter_combo), 0),
            PHONICS_CATALOG.index(item),
        ),
    )

    return list(ranked_catalog[:SELECTED_PHONICS_COUNT])
