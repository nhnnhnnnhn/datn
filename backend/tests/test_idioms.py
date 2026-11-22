def test_list_filters_by_topic_and_trait_together(client):
    res = client.get("/idioms", params={"topic": "love", "trait": "literal"})
    assert res.status_code == 200, res.text
    assert res.json()["total"] == 3


def test_list_trait_without_match_is_empty(client):
    assert client.get("/idioms", params={"trait": "pragmatic"}).json()["total"] == 0


def test_random_filters_by_topic_and_trait_together(client):
    res = client.get("/idioms/random", params={"topic": "love", "trait": "literal"})
    assert res.status_code == 200, res.text
    assert res.json()["topic"] == "love"
