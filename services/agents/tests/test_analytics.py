import unittest
from app.workflow import analyst

class AnalyticsAgentTests(unittest.TestCase):
    def test_numeric_strings_are_summarized_and_charted(self):
        result = analyst({
            "columns": ["month", "revenue"],
            "rows": [["Jan", "10.5"], ["Feb", "20.0"], ["Mar", "15.25"]]
        })
        self.assertEqual(result["analysis"]["rowCount"], 3)
        self.assertIn("revenue", result["analysis"]["numericSummary"])
        self.assertEqual(result["chart"]["yKey"], "revenue")
        self.assertEqual(len(result["chart"]["data"]), 3)

    def test_text_only_results_do_not_create_a_chart(self):
        result = analyst({
            "columns": ["customer", "region"],
            "rows": [["A", "West"], ["B", "East"]]
        })
        self.assertIsNone(result["chart"])
        self.assertEqual(result["analysis"]["rowCount"], 2)

if __name__ == "__main__":
    unittest.main()
