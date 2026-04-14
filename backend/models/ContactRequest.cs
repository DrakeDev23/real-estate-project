namespace capstones.Models
{
    public class ContactRequestItem
    {
        public int RequestId { get; set; }
        public int ProductId { get; set; }
        public string ProductTitle { get; set; } = "";
        public string SellerName { get; set; } = "";
        public string? AgentName { get; set; }
        public string BuyerName { get; set; } = "";
        public string BuyerEmail { get; set; } = "";
        public string Status { get; set; } = "";
        public string RequestedAt { get; set; } = "";
    }

    public class CreateContactRequestRequest
    {
        public int ProductId { get; set; }
        public string? BuyerName { get; set; }
        public string? BuyerEmail { get; set; }
    }
}